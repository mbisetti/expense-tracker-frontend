import { useMutation } from '@tanstack/react-query';
import { resetPassword } from './api';
import type { ApiError } from '../../lib/http';

// S25.3 — consumir el token del reset. El server además verifica el email y revoca todas las
// sesiones (D3), por eso el onSuccess de la página manda a /login.
export function useResetPassword() {
  return useMutation<void, ApiError, { token: string; newPassword: string }>({
    mutationFn: ({ token, newPassword }) => resetPassword(token, newPassword),
  });
}
