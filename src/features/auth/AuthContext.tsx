import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { refresh } from './api';
import { ApiError } from '../../lib/http';
import { AuthContext } from './context';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  const setAccessToken = useCallback((token: string | null) => {
    setAccessTokenState(token);
    setStatus(token ? 'authenticated' : 'unauthenticated');
  }, []);

  useEffect(() => {
    async function tryRefresh() {
      try {
        const response = await refresh();
        setAccessToken(response.accessToken);
      } catch (error) {
        if (error instanceof ApiError) {
          setAccessToken(null);
        } else {
          console.error('Unexpected error during session restore:', error);
          setAccessToken(null);
        }
      }
    }
    tryRefresh();
  }, [setAccessToken]);

  return (
    <AuthContext.Provider value={{ accessToken, status, setAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
}
