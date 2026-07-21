import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { ApiError } from '../../lib/http';
import type { RecurringExpense, RecurringFrequency, Weekday } from './api';

export type CreateRecurringExpenseInput = {
  name: string;
  amount: number;
  currency: string;
  categoryId: string;
  frequency: RecurringFrequency;
  billingDay?: number;
  weekday?: Weekday;
  dueMonth?: number;
  installmentsTotal?: number;
  cashPrice?: number;
  // Sprint 24.4: débito automático.
  autoDebit?: boolean;
  debitAccountId?: string;
  debitPaymentMethodId?: string;
};

// PATCH parcial. Mandar `frequency` re-configura el bloque entero (el server revalida); mandar
// solo `active` (o `amount`, `name`, `categoryId`) deja la recurrencia intacta.
export type UpdateRecurringExpenseInput = {
  name?: string;
  active?: boolean;
  amount?: number;
  categoryId?: string;
  frequency?: RecurringFrequency;
  billingDay?: number | null;
  weekday?: Weekday | null;
  dueMonth?: number | null;
  installmentsTotal?: number | null;
  cashPrice?: number | null;
  // Sprint 24.4: bloque de débito automático (presente = autoritativo en el backend).
  autoDebit?: boolean;
  debitAccountId?: string;
  debitPaymentMethodId?: string;
};

// Respuesta de POST .../debits/retry (S24.4).
export type RetryDebitsResult = { executed: number; stillFailed: number };

// Un recurrente cambia el comprometido/proyección de la tab Gastos y el vínculo desde el form:
// invalidar summary y transactions además de la lista propia.
function useInvalidateRecurring() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['recurring-expenses'] });
    queryClient.invalidateQueries({ queryKey: ['summary'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
  };
}

export function useCreateRecurringExpense() {
  const http = useHttp();
  const invalidate = useInvalidateRecurring();

  return useMutation<RecurringExpense, ApiError, CreateRecurringExpenseInput>({
    mutationFn: (input) =>
      http<RecurringExpense>('/recurring-expenses', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });
}

export function useUpdateRecurringExpense() {
  const http = useHttp();
  const invalidate = useInvalidateRecurring();

  return useMutation<RecurringExpense, ApiError, { id: string; changes: UpdateRecurringExpenseInput }>({
    mutationFn: ({ id, changes }) =>
      http<RecurringExpense>(`/recurring-expenses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(changes),
      }),
    onSuccess: invalidate,
  });
}

export function useDeleteRecurringExpense() {
  const http = useHttp();
  const invalidate = useInvalidateRecurring();

  return useMutation<void, ApiError, string>({
    mutationFn: (id) => http<void>(`/recurring-expenses/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}

// Sprint 24.4 (D4): reintenta los débitos que fallaron por saldo. Invalida summary (badge/caja),
// la lista y transactions (la nueva tx aparece en el feed y el historial).
export function useRetryDebits() {
  const http = useHttp();
  const invalidate = useInvalidateRecurring();

  return useMutation<RetryDebitsResult, ApiError, string>({
    mutationFn: (id) => http<RetryDebitsResult>(`/recurring-expenses/${id}/debits/retry`, { method: 'POST' }),
    onSuccess: invalidate,
  });
}
