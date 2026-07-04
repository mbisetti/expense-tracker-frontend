import { refresh } from './api';

// Single-flight: con rotación de refresh tokens + detección de reuso en el backend,
// dos refreshes en paralelo con la misma cookie disparan la revocación de toda la
// familia (el segundo llega con un token ya rotado). Todos los llamadores comparten
// la misma promesa en curso. También cubre el doble efecto de StrictMode en dev (7c-3).
let refreshPromise: Promise<string | null> | null = null;

export function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = refresh()
      .then((response) => response.accessToken)
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}
