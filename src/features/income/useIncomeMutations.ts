import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { ApiError } from '../../lib/http';
import type { IncomeEntryResponse, IncomeFrequency, IncomeSourceResponse } from './api';

export type CreateIncomeSourceInput = {
  name: string;
  currency: string;
  frequency?: IncomeFrequency;
  expectedAmount?: number;
  billingDay?: number;
  dueMonth?: number;
};

export type CreateIncomeEntryInput = {
  incomeSourceId: string;
  accountId: string;
  grossAmount: number;
  deductionIds?: string[];
  netOverride?: number;
  date: string;
  notes?: string;
  concept?: string;
};

// S36 (FR-3). El bloque de plata es ATÓMICO del lado del server: si viaja grossAmount o
// netOverride, el neto se recalcula desde cero y netOverride ausente significa "sin override".
// Por eso el form manda SIEMPRE los dos juntos cuando toca la plata — así se puede sacar un
// override sin inventar un centinela numérico.
export type UpdateIncomeEntryInput = {
  id: string;
  grossAmount?: number;
  netOverride?: number;
  accountId?: string;
  date?: string;
  notes?: string;
  concept?: string;
};

// Una entry mueve el ledger: invalidar también transactions/accounts/summary
function useInvalidateIncome() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['income'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    queryClient.invalidateQueries({ queryKey: ['summary'] });
  };
}

export function useCreateIncomeSource() {
  const http = useHttp();
  const queryClient = useQueryClient();

  return useMutation<IncomeSourceResponse, ApiError, CreateIncomeSourceInput>({
    mutationFn: (input) =>
      http<IncomeSourceResponse>('/income-sources', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income', 'sources'] });
      // una source recurrente alimenta el card de esperados (['summary','expectedIncome'])
      queryClient.invalidateQueries({ queryKey: ['summary'] });
    },
  });
}

export function useCreateIncomeEntry() {
  const http = useHttp();
  const invalidate = useInvalidateIncome();

  return useMutation<IncomeEntryResponse, ApiError, CreateIncomeEntryInput>({
    mutationFn: (input) =>
      http<IncomeEntryResponse>('/income-entries', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });
}

export function useUpdateIncomeEntry() {
  const http = useHttp();
  const invalidate = useInvalidateIncome();

  return useMutation<IncomeEntryResponse, ApiError, UpdateIncomeEntryInput>({
    mutationFn: ({ id, ...body }) =>
      http<IncomeEntryResponse>(`/income-entries/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: invalidate,
  });
}

export function useDeleteIncomeEntry() {
  const http = useHttp();
  const invalidate = useInvalidateIncome();

  return useMutation<void, ApiError, string>({
    mutationFn: (id) => http<void>(`/income-entries/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}
