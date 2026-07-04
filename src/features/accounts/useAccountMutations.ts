import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { ApiError } from '../../lib/http';
import type { Account, AccountType } from './api';

export type CreateAccountInput = {
  name: string;
  type: AccountType;
  currency: string;
};

export type UpdateAccountInput = {
  name?: string;
  type?: AccountType;
  currency?: string;
};

function useInvalidateAccounts() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    queryClient.invalidateQueries({ queryKey: ['summary'] });
  };
}

export function useCreateAccount() {
  const http = useHttp();
  const invalidate = useInvalidateAccounts();

  return useMutation<Account, ApiError, CreateAccountInput>({
    mutationFn: (input) =>
      http<Account>('/accounts', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: invalidate,
  });
}

export function useUpdateAccount() {
  const http = useHttp();
  const invalidate = useInvalidateAccounts();

  return useMutation<Account, ApiError, { id: string; changes: UpdateAccountInput }>({
    mutationFn: ({ id, changes }) =>
      http<Account>(`/accounts/${id}`, { method: 'PATCH', body: JSON.stringify(changes) }),
    onSuccess: invalidate,
  });
}

export function useDeleteAccount() {
  const http = useHttp();
  const invalidate = useInvalidateAccounts();

  // Contrato: DELETE responde 204 sin body (distinto de transactions, que devuelve 200+body)
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => http<void>(`/accounts/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}
