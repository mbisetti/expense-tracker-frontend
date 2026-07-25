const BASE_URL = import.meta.env.VITE_API_URL;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
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
      body.message ?? response.statusText
    );
  }

  if (response.status === 204) {
    return undefined as T;
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
      body.message ?? response.statusText
    );
  }

  return {
    blob: await response.blob(),
    filename: parseFilename(response.headers.get('Content-Disposition')),
  };
}

// `attachment; filename="manguitos-gastos-20260724.xlsx"` → el nombre. En dev el header es
// cross-origin y sólo se lee porque el backend lo expone (Access-Control-Expose-Headers).
function parseFilename(header: string | null): string | null {
  if (!header) return null;
  const match = /filename="?([^";\n]+)"?/i.exec(header);
  return match ? match[1].trim() : null;
}
