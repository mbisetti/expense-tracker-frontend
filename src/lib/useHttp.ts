import { useCallback } from 'react';
import { useAuth } from '../features/auth/useAuth';
import { refreshAccessToken } from '../features/auth/refreshManager';
import { ApiError, http } from './http';

export function useHttp() {
  const { accessToken, setAccessToken } = useAuth();

  return useCallback(
    async <T>(path: string, options?: RequestInit): Promise<T> => {
      const doFetch = (token: string | null) => {
        const authHeader: Record<string, string> = token
          ? { Authorization: `Bearer ${token}` }
          : {};
        return http<T>(path, {
          ...options,
          headers: {
            ...authHeader,
            ...options?.headers,
          },
        });
      };

      try {
        return await doFetch(accessToken);
      } catch (error) {
        // Silent refresh: 401 en la API → un refresh (single-flight) y un único retry.
        // /auth/* queda afuera: un 401 ahí es credencial inválida, no token vencido.
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
        return doFetch(newToken);
      }
    },
    [accessToken, setAccessToken],
  );
}
