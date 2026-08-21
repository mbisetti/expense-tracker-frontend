import { isNative } from './platform';

// S44 — La base de la API depende de dónde corre el bundle.
//
// En web la topología es same-origin desde S9: el backend sirve el SPA y `VITE_API_URL` es
// `/api/v1`, relativo. Adentro de la app nativa eso NO existe — el origen del WebView es
// `capacitor://localhost` (iOS) o `https://localhost` (Android), así que una ruta relativa
// pega contra el bundle local y devuelve el index.html en vez de JSON.
//
// Por eso en nativo (y sólo en nativo) se le antepone un origen absoluto. La web devuelve el
// valor configurado tal cual, byte por byte lo de siempre: cero riesgo de regresión.
//
// El origen vive en `VITE_NATIVE_API_ORIGIN` y no hardcodeado: hoy apunta a maat.com.ar y
// puede cambiar sin tocar código (por ejemplo si algún día se separa un dominio de API).
function resolveBaseUrl(): string {
  const configured = import.meta.env.VITE_API_URL;
  if (!isNative()) return configured;

  // Ya es absoluta (ej. apuntando a una máquina de la red local para probar en un teléfono
  // con `npm run dev`): se respeta y no se toca.
  if (/^https?:\/\//.test(configured)) return configured;

  const origin = import.meta.env.VITE_NATIVE_API_ORIGIN;
  if (!origin) {
    // Falla ruidosa y temprana. La alternativa es una app que arranca y da 404 en cada
    // pantalla, que es mucho más caro de diagnosticar desde un teléfono.
    //
    // El throw solo no alcanza: corta la evaluación del bundle antes de que corra
    // `bootstrapNative()`, y con `launchAutoHide: false` el síntoma sería un splash puesto
    // para siempre. Se esconde el splash y se escribe el error por pantalla, para que un
    // build mal hecho se vea como lo que es y no como una app colgada en el logo.
    void import('@capacitor/splash-screen')
      .then(({ SplashScreen }) => SplashScreen.hide())
      .catch(() => {});
    const root = document.getElementById('root');
    if (root) {
      root.textContent =
        'Error de build: falta VITE_NATIVE_API_ORIGIN, el origen de la API para la app nativa.';
    }
    throw new Error(
      'VITE_NATIVE_API_ORIGIN no está definida: el build nativo necesita un origen absoluto para la API.'
    );
  }
  return `${origin.replace(/\/$/, '')}${configured}`;
}

const BASE_URL = resolveBaseUrl();

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  /**
   * El cuerpo crudo del error. Algunos códigos traen un campo extra que el copy necesita y que
   * NO se puede sacar del mensaje sin parsear texto: el `symbol` de `INSUFFICIENT_HOLDING` (S43),
   * el `reason` de `INVALID_STATEMENT_PAYMENT` (S27), los `details` de `VALIDATION_ERROR`.
   *
   * Se guarda entero y sin tipar a propósito: tiparlo obligaría a mantener acá un espejo de todos
   * los handlers del backend, y quien lo lee ya sabe qué campo espera de qué código.
   */
  readonly body: Record<string, unknown>;

  constructor(status: number, code: string, message: string, body: Record<string, unknown> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

export async function http<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      body.error ?? 'UNKNOWN_ERROR',
      body.message ?? response.statusText,
      body
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

// Subida multipart (import batch): FormData SIN Content-Type manual — el browser arma el
// boundary solo. Función aparte de http(), que hardcodea JSON: tocarlo arriesga a todos sus
// llamadores para ahorrar 10 líneas.
export async function httpUpload<T>(path: string, body: FormData, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    ...options,
    body,
    credentials: 'include',
    headers: { ...options?.headers },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      errorBody.error ?? 'UNKNOWN_ERROR',
      errorBody.message ?? response.statusText,
      errorBody
    );
  }

  return response.json() as Promise<T>;
}

/** Descarga binaria (Sprint 26): el archivo llega como Blob y el nombre viaja en el header. */
export type BlobDownload = {
  blob: Blob;
  /** Nombre del Content-Disposition, o null si el header no vino (el llamador decide el fallback). */
  filename: string | null;
};

// Descarga autenticada de un archivo. El token vive en memoria (Bearer) → un <a href> no
// autentica: hay que traerlo por fetch y armar el download con el Blob. Un error sigue saliendo
// como el ApiError de siempre (el backend nunca manda un archivo a medias, D5).
export async function httpBlob(path: string, options?: RequestInit): Promise<BlobDownload> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: { ...options?.headers },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      body.error ?? 'UNKNOWN_ERROR',
      body.message ?? response.statusText,
      body
    );
  }

  return {
    blob: await response.blob(),
    filename: parseFilename(response.headers.get('Content-Disposition')),
  };
}

// `attachment; filename="maat-gastos-20260724.xlsx"` → el nombre. En dev el header es
// cross-origin y sólo se lee porque el backend lo expone (Access-Control-Expose-Headers).
function parseFilename(header: string | null): string | null {
  if (!header) return null;
  const match = /filename="?([^";\n]+)"?/i.exec(header);
  return match ? match[1].trim() : null;
}
