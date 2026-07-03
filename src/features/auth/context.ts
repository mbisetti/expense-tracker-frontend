import { createContext } from 'react';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  accessToken: string | null;
  status: AuthStatus;
  setAccessToken: (token: string | null) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
