import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { ApiError } from '../../lib/http';
import type { BudgetResponse } from './api';

export type CreateBudgetInput = {
  categoryId: string;
  limitAmount: number;
  currency: string;
  month: number;
  year: number;
};

// Un presupuesto se ve en el resumen (/summary/budgets), así que se invalida toda la familia
// ['summary'] tras crear/editar/borrar.
function useInvalidateBudgets() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['summary'] });
}

export function useCreateBudget() {
  const http = useHttp();
  const invalidate = useInvalidateBudgets();
  return useMutation<BudgetResponse, ApiError, CreateBudgetInput>({
    mutationFn: (input) =>
      http<BudgetResponse>('/budgets', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: invalidate,
  });
}

export function useUpdateBudget() {
  const http = useHttp();
  const invalidate = useInvalidateBudgets();
  // Sólo limitAmount es mutable (los demás campos son inmutables → IMMUTABLE_FIELD).
  return useMutation<BudgetResponse, ApiError, { id: string; limitAmount: number }>({
    mutationFn: ({ id, limitAmount }) =>
      http<BudgetResponse>(`/budgets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ limitAmount }),
      }),
    onSuccess: invalidate,
  });
}

export function useDeleteBudget() {
  const http = useHttp();
  const invalidate = useInvalidateBudgets();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => http<void>(`/budgets/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}
