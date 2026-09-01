import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { ApiError } from '../../lib/http';
import type { Me } from '../auth/api';

/**
 * S46 (D2/D4) — "ya no me muestres más la guía".
 *
 * La llaman las dos salidas del wizard, "Listo" y "Saltar por ahora": para el server son el
 * mismo hecho. Es idempotente allá, así que acá no hace falta cuidarse de llamarla dos veces.
 *
 * El perfil cacheado se actualiza a mano además de invalidarse: el dashboard decide su CTA con
 * `me.onboarded` y se pinta apenas llegamos, antes de que vuelva el refetch.
 */
export function useCompleteOnboarding() {
  const http = useHttp();
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, void>({
    mutationFn: () => http<void>('/users/me/onboarding', { method: 'POST' }),
    onSuccess: () => {
      queryClient.setQueryData(['me'], (previous?: Me) =>
        previous ? { ...previous, onboarded: true } : previous,
      );
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}
