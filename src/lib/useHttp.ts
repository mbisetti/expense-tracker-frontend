import { useCallback } from 'react';
import { useAuth } from '../features/auth/useAuth';
import { refreshAccessToken } from '../features/auth/refreshManager';
import { ApiError, http, httpBlob, type BlobDownload } from './http';

function withAuth(options: RequestInit | undefined, token: string | null): RequestInit {
  const authHeader: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  return {
    ...options,
    headers: {
      ...authHeader,
      ...options?.headers,
    },
  };
}

// Silent refresh: 401 en la API → un refresh (single-flight) y un único retry. /auth/* queda
// afuera: un 401 ahí es credencial inválida, no token vencido.
// Sprint 26: el patrón vive UNA sola vez y lo comparten useHttp (JSON) y useHttpBlob (archivos).
// Duplicarlo garantizaba que las dos copias divergieran en el próximo cambio de auth.
function useAuthorizedRequest() {
  const { accessToken, setAccessToken } = useAuth();

  return useCallback(
    async <T>(path: string, execute: (token: string | null) => Promise<T>): Promise<T> => {
      try {
        return await execute(accessToken);
      } catch (error) {
        const isExpired = error instanceof ApiError && error.status === 401;
        if (!isExpired || path.startsWith('/auth')) {
          throw error;
        }
        const newToken = await refreshAccessToken();
        if (!newToken) {
          setAccessToken(null); // ProtectedRoute redirige a /login
          throw error;
        }
        setAccessToken(newToken);
        return execute(newToken);
      }
    },
    [accessToken, setAccessToken],
  );
}

export function useHttp() {
  const request = useAuthorizedRequest();

  return useCallback(
    <T>(path: string, options?: RequestInit): Promise<T> =>
      request(path, (token) => http<T>(path, withAuth(options, token))),
    [request],
  );
}

// Sprint 26: descarga autenticada de archivos (export XLSX). Mismo silent refresh que useHttp.
export function useHttpBlob() {
  const request = useAuthorizedRequest();

  return useCallback(
    (path: string, options?: RequestInit): Promise<BlobDownload> =>
      request(path, (token) => httpBlob(path, withAuth(options, token))),
    [request],
  );
}
