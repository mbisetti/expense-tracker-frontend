import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { ApiError } from '../../lib/http';
import type { TransferResponse } from './api';

export type CreateTransferInput = {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string;
  description?: string;
};

// Un transfer mueve DOS cuentas del ledger: invalidar transfers + transactions +
// accounts + summary (la contracara en el cliente del invariante ACID del backend).
function useInvalidateTransfers() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['transfers'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    queryClient.invalidateQueries({ queryKey: ['summary'] });
  };
}

export function useCreateTransfer() {
  const http = useHttp();
  const invalidate = useInvalidateTransfers();

  return useMutation<TransferResponse, ApiError, CreateTransferInput>({
    mutationFn: (input) =>
      http<TransferResponse>('/transfers', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });
}

export function useDeleteTransfer() {
  const http = useHttp();
  const invalidate = useInvalidateTransfers();

  return useMutation<void, ApiError, string>({
    mutationFn: (id) => http<void>(`/transfers/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}
