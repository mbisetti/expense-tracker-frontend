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

export type AuthResponse = {
  accessToken: string;
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
