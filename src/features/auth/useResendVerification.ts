import { useMutation } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { ApiError } from '../../lib/http';

// S25.2 — reenviar el mail de verificación (banner y Ajustes). Autenticado: vive bajo
// /users/me y no bajo /auth. Rate-limited en el server: el error RATE_LIMIT_EXCEEDED
// es esperable si el usuario aprieta muchas veces seguidas.
export function useResendVerification() {
  const http = useHttp();
  return useMutation<void, ApiError, void>({
    mutationFn: () => http<void>('/users/me/verification-email', { method: 'POST' }),
  });
}
