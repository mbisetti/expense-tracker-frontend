import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { ApiError } from '../../lib/http';
import type { AccountPerformance, AdjustValueInput } from './api';
import type { TransactionResponse } from '../transactions/api';

// S40 (bloque A). El rendimiento NO cuelga de ['accounts']: es una vista aparte, más cara, que
// sólo se pide cuando hay una cuenta de inversión en pantalla. Ajustar el valor sí lo invalida
// (el ajuste ES rendimiento, D2), igual que ['accounts'] y ['summary'] por el balance.
export function useAccountPerformance(accountId: string | undefined, enabled = true) {
  const http = useHttp();
  return useQuery({
    queryKey: ['account-performance', accountId],
    queryFn: () => http<AccountPerformance>(`/accounts/${accountId}/performance`),
    enabled: Boolean(accountId) && enabled,
  });
}

/**
 * "Actualizar valor" / "Ajustar deuda". El usuario manda cuánto vale HOY; el server crea la
 * transacción por la diferencia.
 *
 * El 204 (el valor no cambió, no hay nada que registrar) llega como `null`.
 */
export function useAdjustAccountValue() {
  const http = useHttp();
  const queryClient = useQueryClient();

  return useMutation<
    TransactionResponse | null,
    ApiError,
    { accountId: string; input: AdjustValueInput }
  >({
    mutationFn: ({ accountId, input }) =>
      http<TransactionResponse | null>(`/accounts/${accountId}/value`, {
        method: 'PUT',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['account-performance'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
    },
  });
}
