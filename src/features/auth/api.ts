import { http } from '../../lib/http';

export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  name: string;
  email: string;
  password: string;
  defaultCurrency?: string;
};

export type GoogleLoginRequest = {
  idToken: string;
};

export type AuthResponse = {
  accessToken: string;
};

// Perfil propio (GET/PATCH /users/me). defaultCurrency = moneda favorita.
export type Me = {
  id: string;
  email: string;
  name: string;
  defaultCurrency: string;
  createdAt: string;
};

export function login(payload: LoginRequest): Promise<AuthResponse> {
  return http<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function register(payload: RegisterRequest): Promise<AuthResponse> {
  return http<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// S25.1: "Continuar con Google". El backend verifica el ID token → emite nuestros tokens
// (access en body + refresh cookie), idéntico a login/register.
export function googleLogin(payload: GoogleLoginRequest): Promise<AuthResponse> {
  return http<AuthResponse>('/auth/google', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function refresh(): Promise<AuthResponse> {
  return http<AuthResponse>('/auth/refresh', {
    method: 'POST',
  });
}

export function logout(): Promise<void> {
  return http<void>('/auth/logout', {
    method: 'POST',
  });
}
