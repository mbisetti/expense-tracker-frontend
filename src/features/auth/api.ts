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
  /** S27.1: monedas con las que el usuario dijo que trabaja. Se SUMAN a las que la cuenta ya
   *  tiene para armar los selectores de moneda — nunca las reemplazan (D1). Vacía = sin
   *  configurar; el server nunca manda null. */
  workingCurrencies: string[];
  /** S7: false = entró solo con Google y no tiene contraseña que pedirle al reautenticar. */
  hasPassword: boolean;
  /** S25.4: la cuenta tiene Google vinculado. Para la fila de Conectores de la página Cuenta. */
  googleLinked: boolean;
  /** S25.2: false = todavía no clickeó el link del mail. Nunca bloquea nada (D1): la app
   *  muestra el banner "Verificá tu email" y la fila de Ajustes, nada más. */
  emailVerified: boolean;
  /** S46 (D2): ya terminó o saltó la guía de primeros pasos. false = todavía la puede ver. */
  onboarded: boolean;
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

// S46 (D3) — el perfil con un token EXPLÍCITO, para el instante después del login con Google.
//
// useHttp no sirve ahí: toma el token del contexto por closure, y en el onSuccess de la
// mutación ese closure todavía tiene el token viejo (null). Acá el token es el que acaba de
// llegar en la respuesta.
export function fetchMe(accessToken: string): Promise<Me> {
  return http<Me>('/users/me', { headers: { Authorization: `Bearer ${accessToken}` } });
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

// S25.2/25.3 — flujos de email. Los tres son públicos: el usuario abre el link del mail en un
// browser que puede no tener sesión. El token viaja en el body (no en la URL del endpoint,
// que termina en logs). El reenvío NO está acá: es autenticado (useResendVerification).

export function verifyEmail(token: string): Promise<void> {
  return http<void>('/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

// La respuesta es 204 exista o no el email (anti-enumeración): el "éxito" del form siempre
// dice lo mismo.
export function forgotPassword(email: string): Promise<void> {
  return http<void>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(token: string, newPassword: string): Promise<void> {
  return http<void>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  });
}
