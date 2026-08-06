import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { ApiError } from '../../lib/http';
import type { TransferResponse } from './api';

export type CreateTransferInput = {
  fromAccountId: string;
  toAccountId: string;
  fromAmount: number;
  toAmount: number;
  // Sprint 22: moneda por pata (undefined → principal de cada cuenta).
  fromCurrency?: string;
  toCurrency?: string;
  date: string;
  description?: string;
  // S41: comisión que cobra el DESTINO por recibir la plata, en toCurrency. No se resta de
  // toAmount — el backend la materializa como un gasto aparte en la cuenta destino, con
  // categoría "Comisiones", para que aparezca en la tab Gastos. Se manda el MONTO aunque el
  // usuario la haya cargado como %: el banco cobra un número, no una fórmula.
  fee?: number;
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

// Sprint 23 (D4): editar un transfer = PUT atómico (el backend hace delete+recreate en una
// transacción; el transfer resultante tiene id nuevo). Mismo shape de input que el alta.
export function useUpdateTransfer() {
  const http = useHttp();
  const invalidate = useInvalidateTransfers();

  return useMutation<TransferResponse, ApiError, { id: string; input: CreateTransferInput }>({
    mutationFn: ({ id, input }) =>
      http<TransferResponse>(`/transfers/${id}`, {
        method: 'PUT',
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
