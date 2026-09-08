import { refresh } from './api';
import { ApiError } from '../../lib/http';

// Resultado del refresh, en tres estados y no en dos:
//   - string: sesión viva, token nuevo.
//   - null: el server dijo que NO hay sesión (4xx en /auth/refresh: cookie vencida, revocada o
//     ausente). Es lo único que desloguea.
//   - RefreshUnavailableError: no se pudo saber. Red caída, un 5xx, el 502 del swap de un
//     deploy. Antes esto también era null, y "la red parpadeó" terminaba en la pantalla de login
//     con la cookie perfectamente válida.
export class RefreshUnavailableError extends Error {
  constructor() {
    super('No se pudo refrescar la sesión');
    this.name = 'RefreshUnavailableError';
  }
}

// Reintentos ante fallas transitorias. El caso típico es una respuesta perdida (el server rotó
// el token y el browser nunca vio el Set-Cookie): el reintento presenta la cookie vieja dentro
// de la ventana de gracia del back (V61) y recibe un hermano. Con un par de segundos alcanza.
export const RETRY_DELAYS_MS = [500, 1500, 4000];

export const REFRESH_LOCK_NAME = 'maat:auth-refresh';

// Un 4xx del propio /auth/refresh es una respuesta del server sobre la cookie. 408 y 429 no
// dicen nada de ella.
function isDefinitiveRejection(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status >= 400 &&
    error.status < 500 &&
    error.status !== 408 &&
    error.status !== 429
  );
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function refreshWithRetries(): Promise<string | null> {
  for (let attempt = 0; ; attempt++) {
    try {
      return (await refresh()).accessToken;
    } catch (error) {
      if (isDefinitiveRejection(error)) return null;
      if (attempt >= RETRY_DELAYS_MS.length) throw new RefreshUnavailableError();
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }
}

// Lock entre pestañas del mismo browser (Web Locks). El single-flight de abajo es por pestaña:
// dos pestañas abiertas refrescaban a la vez con la misma cookie cuando vencía el access token
// (el polling de notificaciones corre en cada una), y la segunda era "reuso" para el back. Con
// el lock, la segunda espera, y cuando entra ya tiene en el cookie jar el token que dejó la
// primera: rota de nuevo, sin carrera. Donde no hay Web Locks (jsdom), se ejecuta directo.
function withCrossTabLock<T>(fn: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
  if (!locks) return fn();
  return locks.request(REFRESH_LOCK_NAME, fn) as Promise<T>;
}

// Single-flight: todos los llamadores de esta pestaña comparten la misma promesa en curso.
// También cubre el doble efecto de StrictMode en dev (7c-3).
let refreshPromise: Promise<string | null> | null = null;

export function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = withCrossTabLock(refreshWithRetries).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}
