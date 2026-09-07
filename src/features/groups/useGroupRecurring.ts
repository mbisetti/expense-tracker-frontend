import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { ApiError } from '../../lib/http';
import type { CreateGroupRecurringInput, GroupRecurring } from './api';

// Esto NO mueve plata y por eso no está en MONEY_MOVING_HOOKS, aunque sea lo que después la mueve.
//
// Crear la plantilla no escribe ninguna transacción: el gasto sale cuando vence, y lo genera el
// scheduler del backend. Invalidar cuentas y resúmenes acá sería trabajo de red por algo que no
// pasó todavía.
function useInvalidateRecurring() {
  const queryClient = useQueryClient();
  return (groupId: string) =>
    queryClient.invalidateQueries({ queryKey: ['group-recurring', groupId] });
}

export function useGroupRecurring(groupId: string | undefined) {
  const http = useHttp();
  return useQuery({
    queryKey: ['group-recurring', groupId],
    queryFn: () => http<GroupRecurring[]>(`/groups/${groupId}/recurring`),
    enabled: Boolean(groupId),
  });
}

export function useCreateGroupRecurring() {
  const http = useHttp();
  const invalidate = useInvalidateRecurring();

  return useMutation<GroupRecurring, ApiError, { groupId: string; input: CreateGroupRecurringInput }>({
    mutationFn: ({ groupId, input }) =>
      http<GroupRecurring>(`/groups/${groupId}/recurring`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (_data, { groupId }) => invalidate(groupId),
  });
}

// Prender y apagar sin perder la plantilla.
export function useToggleGroupRecurring() {
  const http = useHttp();
  const invalidate = useInvalidateRecurring();

  return useMutation<GroupRecurring, ApiError, { groupId: string; recurringId: string; active: boolean }>({
    mutationFn: ({ groupId, recurringId, active }) =>
      http<GroupRecurring>(`/groups/${groupId}/recurring/${recurringId}?active=${active}`, {
        method: 'PATCH',
      }),
    onSuccess: (_data, { groupId }) => invalidate(groupId),
  });
}

export function useDeleteGroupRecurring() {
  const http = useHttp();
  const invalidate = useInvalidateRecurring();

  return useMutation<void, ApiError, { groupId: string; recurringId: string }>({
    mutationFn: ({ groupId, recurringId }) =>
      http<void>(`/groups/${groupId}/recurring/${recurringId}`, { method: 'DELETE' }),
    onSuccess: (_data, { groupId }) => invalidate(groupId),
  });
}
