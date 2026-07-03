import { useCallback } from 'react';
import { useAuth } from '../features/auth/useAuth';
import { http } from './http';

export function useHttp() {
  const { accessToken } = useAuth();

  return useCallback(
    <T>(path: string, options?: RequestInit): Promise<T> => {
      const authHeader: Record<string, string> = accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : {};
      return http<T>(path, {
        ...options,
        headers: {
          ...authHeader,
          ...options?.headers,
        },
      });
    },
    [accessToken],
  );
}
