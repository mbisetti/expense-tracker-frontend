import { createContext } from 'react';

// 'unavailable': el refresh del arranque no pudo ni confirmar ni negar la sesión (red caída,
// deploy en curso). No es 'unauthenticated': la cookie puede estar perfectamente viva, así que
// no se manda a nadie al login; AuthProvider reintenta solo.
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'unavailable';

export interface AuthContextValue {
  accessToken: string | null;
  status: AuthStatus;
  setAccessToken: (token: string | null) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
