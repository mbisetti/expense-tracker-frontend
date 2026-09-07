import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { ApiError } from '../../lib/http';
import type { CreateSettlementInput, GroupBalances, Settlement } from './api';

// ⚠️ ESTE ARCHIVO MUEVE PLATA, igual que useGroupExpenses.ts, y por eso vive aparte.
//
// Anotar un pago escribe en el ledger de los DOS: una transferencia del lado del que paga y un
// cobro del lado del que cobra. Está en MONEY_MOVING_HOOKS de lib/cacheContract.test.ts, que
// verifica que invalide las tres keys del Contrato 4.
function useInvalidateSettlement() {
  const queryClient = useQueryClient();
  return (groupId: string) => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    queryClient.invalidateQueries({ queryKey: ['summary'] });
    queryClient.invalidateQueries({ queryKey: ['groups'] });
    queryClient.invalidateQueries({ queryKey: ['groups', groupId] });
    queryClient.invalidateQueries({ queryKey: ['group-balances', groupId] });
  };
}

export function useGroupBalances(groupId: string | undefined) {
  const http = useHttp();
  return useQuery({
    queryKey: ['group-balances', groupId],
    queryFn: () => http<GroupBalances>(`/groups/${groupId}/balances`),
    enabled: Boolean(groupId),
  });
}

export function useSettleGroup() {
  const http = useHttp();
  const invalidate = useInvalidateSettlement();

  return useMutation<Settlement, ApiError, { groupId: string; input: CreateSettlementInput }>({
    mutationFn: ({ groupId, input }) =>
      http<Settlement>(`/groups/${groupId}/settlements`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (_data, { groupId }) => invalidate(groupId),
  });
}

export function useUndoSettlement() {
  const http = useHttp();
  const invalidate = useInvalidateSettlement();

  return useMutation<void, ApiError, { groupId: string; settlementId: string }>({
    mutationFn: ({ groupId, settlementId }) =>
      http<void>(`/groups/${groupId}/settlements/${settlementId}`, { method: 'DELETE' }),
    onSuccess: (_data, { groupId }) => invalidate(groupId),
  });
}
