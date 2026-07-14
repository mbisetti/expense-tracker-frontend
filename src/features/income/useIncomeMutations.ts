import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { ApiError } from '../../lib/http';
import type { IncomeEntryResponse, IncomeSourceResponse } from './api';

export type CreateIncomeSourceInput = {
  name: string;
  currency: string;
};

export type CreateIncomeEntryInput = {
  incomeSourceId: string;
  accountId: string;
  grossAmount: number;
  deductionIds?: string[];
  netOverride?: number;
  date: string;
  notes?: string;
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['income', 'sources'] }),
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

export function useDeleteIncomeEntry() {
  const http = useHttp();
  const invalidate = useInvalidateIncome();

  return useMutation<void, ApiError, string>({
    mutationFn: (id) => http<void>(`/income-entries/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}
