import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { ApiError } from '../../lib/http';
import type { DeductionType, IncomeDeductionResponse } from './api';

export type CreateDeductionInput = {
  sourceId: string;
  name: string;
  type: DeductionType;
  value: number;
};

export type UpdateDeductionInput = {
  sourceId: string;
  id: string;
  name?: string;
  value?: number;
  active?: boolean;
};

function useInvalidateDeductions(sourceId: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['income', 'deductions', sourceId] });
    // el desglose de entries futuras depende de las deducciones activas
    queryClient.invalidateQueries({ queryKey: ['income', 'entries'] });
  };
}

export function useCreateDeduction(sourceId: string) {
  const http = useHttp();
  const invalidate = useInvalidateDeductions(sourceId);

  return useMutation<IncomeDeductionResponse, ApiError, CreateDeductionInput>({
    mutationFn: ({ name, type, value }) =>
      http<IncomeDeductionResponse>(`/income-sources/${sourceId}/deductions`, {
        method: 'POST',
        body: JSON.stringify({ name, type, value }),
      }),
    onSuccess: invalidate,
  });
}

export function useUpdateDeduction(sourceId: string) {
  const http = useHttp();
  const invalidate = useInvalidateDeductions(sourceId);

  return useMutation<IncomeDeductionResponse, ApiError, UpdateDeductionInput>({
    mutationFn: ({ id, name, value, active }) =>
      http<IncomeDeductionResponse>(`/income-sources/${sourceId}/deductions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name, value, active }),
      }),
    onSuccess: invalidate,
  });
}

export function useDeleteDeduction(sourceId: string) {
  const http = useHttp();
  const invalidate = useInvalidateDeductions(sourceId);

  return useMutation<void, ApiError, string>({
    mutationFn: (id) =>
      http<void>(`/income-sources/${sourceId}/deductions/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}
