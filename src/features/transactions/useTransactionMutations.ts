import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { ApiError } from '../../lib/http';
import type { TransactionResponse, TransactionType } from './api';

export type CreateTransactionInput = {
  accountId: string;
  type: TransactionType;
  amount: number;
  date: string;
  categoryId?: string;
  paymentMethodId?: string;
  description?: string;
};

export type UpdateTransactionInput = {
  amount?: number;
  date?: string;
  categoryId?: string;
  paymentMethodId?: string;
  description?: string;
};

function useInvalidateTransactions() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
  };
}

export function useCreateTransaction() {
  const http = useHttp();
  const invalidate = useInvalidateTransactions();

  return useMutation<TransactionResponse, ApiError, CreateTransactionInput>({
    mutationFn: (input) =>
      http<TransactionResponse>('/transactions', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });
}

export function useUpdateTransaction() {
  const http = useHttp();
  const invalidate = useInvalidateTransactions();

  return useMutation<TransactionResponse, ApiError, { id: string; changes: UpdateTransactionInput }>({
    mutationFn: ({ id, changes }) =>
      http<TransactionResponse>(`/transactions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(changes),
      }),
    onSuccess: invalidate,
  });
}

export function useDeleteTransaction() {
  const http = useHttp();
  const invalidate = useInvalidateTransactions();

  return useMutation<TransactionResponse, ApiError, string>({
    mutationFn: (id) =>
      http<TransactionResponse>(`/transactions/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}
