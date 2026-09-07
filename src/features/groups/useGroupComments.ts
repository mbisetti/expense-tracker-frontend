import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { ApiError } from '../../lib/http';
import type { GroupComment } from './api';

// Los comentarios NO mueven plata: no tocan ninguna transacción, así que no van a
// MONEY_MOVING_HOOKS ni invalidan cuentas ni resúmenes. Sólo su propia lista.
function useInvalidateComments() {
  const queryClient = useQueryClient();
  return (expenseId: string) =>
    queryClient.invalidateQueries({ queryKey: ['group-comments', expenseId] });
}

export function useGroupComments(groupId: string | undefined, expenseId: string | undefined) {
  const http = useHttp();
  return useQuery({
    queryKey: ['group-comments', expenseId],
    queryFn: () => http<GroupComment[]>(`/groups/${groupId}/expenses/${expenseId}/comments`),
    enabled: Boolean(groupId && expenseId),
  });
}

export function useAddGroupComment() {
  const http = useHttp();
  const invalidate = useInvalidateComments();

  return useMutation<GroupComment, ApiError, { groupId: string; expenseId: string; body: string }>({
    mutationFn: ({ groupId, expenseId, body }) =>
      http<GroupComment>(`/groups/${groupId}/expenses/${expenseId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      }),
    onSuccess: (_data, { expenseId }) => invalidate(expenseId),
  });
}

export function useDeleteGroupComment() {
  const http = useHttp();
  const invalidate = useInvalidateComments();

  return useMutation<void, ApiError, { groupId: string; expenseId: string; commentId: string }>({
    mutationFn: ({ groupId, commentId }) =>
      http<void>(`/groups/${groupId}/comments/${commentId}`, { method: 'DELETE' }),
    onSuccess: (_data, { expenseId }) => invalidate(expenseId),
  });
}
