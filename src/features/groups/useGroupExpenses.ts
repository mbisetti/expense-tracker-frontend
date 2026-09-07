import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { ApiError } from '../../lib/http';
import type { PageResponse } from '../transactions/api';
import type { CreateGroupExpenseInput, GroupExpense } from './api';

// ⚠️ ESTE ARCHIVO MUEVE PLATA, y por eso vive aparte de useGroups.ts.
//
// Un gasto de grupo escribe transacciones REALES en el ledger de cada miembro que ya eligió
// cuenta: mueve saldos, cuenta en el mes y toca presupuestos. Está en la lista
// MONEY_MOVING_HOOKS de lib/cacheContract.test.ts, que verifica que invalide las tres keys del
// Contrato 4. Ese test existe porque una vez alguien reinventó la regla incompleta.
//
// Y una key más que las tres obligatorias: ['groups'], porque el saldo del grupo cambia.
function useInvalidateGroupExpense() {
  const queryClient = useQueryClient();
  return (groupId: string) => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    queryClient.invalidateQueries({ queryKey: ['summary'] });
    queryClient.invalidateQueries({ queryKey: ['expenses'] });
    queryClient.invalidateQueries({ queryKey: ['groups'] });
    queryClient.invalidateQueries({ queryKey: ['groups', groupId] });
    queryClient.invalidateQueries({ queryKey: ['group-expenses', groupId] });
  };
}

// Paginado: un grupo con un año de historia no entra en una respuesta ni en una pantalla.
export function useGroupExpenses(groupId: string | undefined) {
  const http = useHttp();
  return useQuery({
    queryKey: ['group-expenses', groupId],
    queryFn: () => http<PageResponse<GroupExpense>>(`/groups/${groupId}/expenses`),
    enabled: Boolean(groupId),
  });
}

// Editar es rehacer el gasto entero, no parchearlo: cambiar el monto o el reparto cambia quién le
// debe a quién. El server responde 409 si alguien ya pagó su parte.
export function useUpdateGroupExpense() {
  const http = useHttp();
  const invalidate = useInvalidateGroupExpense();

  return useMutation<
    GroupExpense,
    ApiError,
    { groupId: string; expenseId: string; input: CreateGroupExpenseInput }
  >({
    mutationFn: ({ groupId, expenseId, input }) =>
      http<GroupExpense>(`/groups/${groupId}/expenses/${expenseId}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: (_data, { groupId }) => invalidate(groupId),
  });
}

export function useCreateGroupExpense() {
  const http = useHttp();
  const invalidate = useInvalidateGroupExpense();

  return useMutation<GroupExpense, ApiError, { groupId: string; input: CreateGroupExpenseInput }>({
    mutationFn: ({ groupId, input }) =>
      http<GroupExpense>(`/groups/${groupId}/expenses`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (_data, { groupId }) => invalidate(groupId),
  });
}

// Deshace el fan-out entero, no sólo tu fila: borra también lo que se anotó en el ledger de los
// demás. Por eso la UI lo pre-confirma.
export function useDeleteGroupExpense() {
  const http = useHttp();
  const invalidate = useInvalidateGroupExpense();

  return useMutation<void, ApiError, { groupId: string; expenseId: string }>({
    mutationFn: ({ groupId, expenseId }) =>
      http<void>(`/groups/${groupId}/expenses/${expenseId}`, { method: 'DELETE' }),
    onSuccess: (_data, { groupId }) => invalidate(groupId),
  });
}
