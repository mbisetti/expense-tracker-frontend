import { useMutation } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { ApiError } from '../../lib/http';

// Borra la propia cuenta (DELETE /users/me). El backend elimina el usuario y, por cascade,
// todos sus datos. El caller limpia la sesión y redirige.
export function useDeleteAccount() {
  const http = useHttp();
  return useMutation<void, ApiError, void>({
    mutationFn: () => http<void>('/users/me', { method: 'DELETE' }),
  });
}
