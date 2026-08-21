import { useMutation } from '@tanstack/react-query';
import { forgotPassword } from './api';
import type { ApiError } from '../../lib/http';

// S25.3 — pedir el mail de reset. El server responde 204 exista o no el email.
export function useForgotPassword() {
  return useMutation<void, ApiError, { email: string }>({
    mutationFn: ({ email }) => forgotPassword(email),
  });
}
