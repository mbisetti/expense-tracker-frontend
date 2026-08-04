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
  // Sprint 22: moneda de la tx (null/undefined → principal de la cuenta). Solo CREDIT la fija.
  currency?: string;
  // Sprint 24.3: vínculo opcional a un gasto recurrente (solo EXPENSE, misma moneda).
  recurringExpenseId?: string;
};

export type UpdateTransactionInput = {
  amount?: number;
  date?: string;
  categoryId?: string;
  paymentMethodId?: string;
  description?: string;
  // Sprint 24.3: "" = desvincular, UUID = vincular, ausente = no tocar (patrón linkedAccountId).
  recurringExpenseId?: string;
};

function useInvalidateTransactions() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    queryClient.invalidateQueries({ queryKey: ['summary'] });
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

// S38: "está bien así" — saca el movimiento de la bandeja sin editarlo. El otro camino para
// vaciarla es el PATCH, que sella solo del lado del server: editar ES revisar.
export function useMarkReviewed() {
  const http = useHttp();
  const invalidate = useInvalidateTransactions();

  return useMutation<void, ApiError, string>({
    mutationFn: (id) => http<void>(`/transactions/${id}/review`, { method: 'POST' }),
    onSuccess: invalidate,
  });
}

/** "Marcar todas": el usuario mira la lista, ve que está bien y la vacía de una. */
export function useMarkReviewedBulk() {
  const http = useHttp();
  const invalidate = useInvalidateTransactions();

  return useMutation<void, ApiError, string[]>({
    mutationFn: (ids) =>
      http<void>('/transactions/review', { method: 'POST', body: JSON.stringify({ ids }) }),
    onSuccess: invalidate,
  });
}

export function useDeleteTransaction() {
  const http = useHttp();
  const invalidate = useInvalidateTransactions();

  // Contrato: DELETE responde 200 con TransactionResponse completo (accountBalance
  // recalculado post-delete), NO 204 — fijado por TransactionIntegrationTest en el
  // backend. Si se simplifica a { accountBalance } (backlog 6c-1), ajustar el tipo.
  return useMutation<TransactionResponse, ApiError, string>({
    mutationFn: (id) =>
      http<TransactionResponse>(`/transactions/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}
