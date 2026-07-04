import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { refreshAccessToken } from './refreshManager';
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
    // refreshAccessToken es single-flight: el doble efecto de StrictMode comparte
    // una sola rotación (dos en paralelo dispararían la detección de reuso)
    async function tryRefresh() {
      const token = await refreshAccessToken();
      setAccessToken(token);
    }
    tryRefresh();
  }, [setAccessToken]);

  return (
    <AuthContext.Provider value={{ accessToken, status, setAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
}
