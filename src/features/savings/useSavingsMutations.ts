import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { ApiError } from '../../lib/http';
import type { SavingsGoalResponse } from './api';

export type CreateSavingsGoalInput = {
  name: string;
  targetAmount: number;
  currency: string;
  deadline?: string;
  currentAmount?: number;
};

export type UpdateSavingsGoalInput = {
  name?: string;
  targetAmount?: number;
  currentAmount?: number;
  deadline?: string | null;
};

function useInvalidateSavings() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['savings'] });
}

export function useCreateSavingsGoal() {
  const http = useHttp();
  const invalidate = useInvalidateSavings();
  return useMutation<SavingsGoalResponse, ApiError, CreateSavingsGoalInput>({
    mutationFn: (input) =>
      http<SavingsGoalResponse>('/savings', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: invalidate,
  });
}

export function useUpdateSavingsGoal() {
  const http = useHttp();
  const invalidate = useInvalidateSavings();
  return useMutation<
    SavingsGoalResponse,
    ApiError,
    { id: string; changes: UpdateSavingsGoalInput }
  >({
    mutationFn: ({ id, changes }) =>
      http<SavingsGoalResponse>(`/savings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(changes),
      }),
    onSuccess: invalidate,
  });
}

export function useDeleteSavingsGoal() {
  const http = useHttp();
  const invalidate = useInvalidateSavings();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => http<void>(`/savings/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}
