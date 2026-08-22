import { useMutation, useQueryClient } from '@tanstack/react-query';
import { http, type ApiError } from '../../lib/http';

// S25.4 (D4) — consumir el token del link que llegó al email nuevo. Público (la página puede
// abrirse sin sesión). Si hay una sesión abierta en este browser, la invalidación de ['me']
// hace que la app muestre el email nuevo al instante.
export function useConfirmEmailChange() {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, { token: string }>({
    mutationFn: ({ token }) =>
      http<void>('/auth/confirm-email-change', {
        method: 'POST',
        body: JSON.stringify({ token }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}
