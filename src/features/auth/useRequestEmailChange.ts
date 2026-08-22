import { useMutation } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { ApiError } from '../../lib/http';

// S25.4 (D4) — pedir el cambio de email. No cambia nada hasta el click en el mail que llega al
// email NUEVO, así que acá no se invalida ['me']: el email de la cuenta sigue siendo el mismo.
export function useRequestEmailChange() {
  const http = useHttp();
  return useMutation<void, ApiError, { newEmail: string }>({
    mutationFn: (input) =>
      http<void>('/users/me/email-change', { method: 'POST', body: JSON.stringify(input) }),
  });
}
