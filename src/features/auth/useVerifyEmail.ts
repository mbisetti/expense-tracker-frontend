import { useMutation, useQueryClient } from '@tanstack/react-query';
import { verifyEmail } from './api';
import type { ApiError } from '../../lib/http';

// S25.2 — consumir el token del link del mail. La invalidación de ['me'] es lo que hace
// desaparecer el banner "Verificá tu email" si el usuario tenía la app abierta en otra pestaña.
export function useVerifyEmail() {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, { token: string }>({
    mutationFn: ({ token }) => verifyEmail(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}
