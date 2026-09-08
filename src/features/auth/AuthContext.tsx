import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { refreshAccessToken } from './refreshManager';
import { AuthContext, type AuthStatus } from './context';

type AuthProviderProps = {
  children: ReactNode;
};

// Cuánto esperar entre reintentos del refresh del arranque mientras el server no contesta.
// Además se reintenta apenas el browser avisa que volvió la conexión.
export const UNAVAILABLE_RETRY_MS = 10_000;

export function AuthProvider({ children }: AuthProviderProps) {
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  const setAccessToken = useCallback((token: string | null) => {
    setAccessTokenState(token);
    setStatus(token ? 'authenticated' : 'unauthenticated');
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    // refreshAccessToken es single-flight: el doble efecto de StrictMode comparte una sola
    // rotación. Devuelve null SOLO cuando el server niega la sesión; si no pudo contestar
    // (red caída, deploy), lanza, y eso NO es "sin sesión": queda en 'unavailable' y se
    // reintenta. Antes cualquier falla mandaba al login con la cookie todavía válida.
    async function tryRefresh() {
      try {
        const token = await refreshAccessToken();
        if (!cancelled) setAccessToken(token);
      } catch {
        if (cancelled) return;
        setStatus('unavailable');
        timer = setTimeout(tryRefresh, UNAVAILABLE_RETRY_MS);
      }
    }
    const onOnline = () => {
      if (timer) clearTimeout(timer);
      tryRefresh();
    };
    window.addEventListener('online', onOnline);
    tryRefresh();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener('online', onOnline);
    };
  }, [setAccessToken]);

  return (
    <AuthContext.Provider value={{ accessToken, status, setAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
}
