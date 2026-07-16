import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { ApiError } from '../../lib/http';
import type { PaymentMethod, PaymentMethodType } from './api';

export type CreatePaymentMethodInput = {
  accountId: string;
  name: string;
  type: PaymentMethodType;
  isDefault: boolean;
};

export type UpdatePaymentMethodInput = {
  name?: string;
  type?: PaymentMethodType;
  isDefault?: boolean;
};

function useInvalidatePaymentMethods() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
  };
}

export function useCreatePaymentMethod() {
  const http = useHttp();
  const invalidate = useInvalidatePaymentMethods();

  return useMutation<PaymentMethod, ApiError, CreatePaymentMethodInput>({
    mutationFn: (input) =>
      http<PaymentMethod>('/payment-methods', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: invalidate,
  });
}

export function useUpdatePaymentMethod() {
  const http = useHttp();
  const invalidate = useInvalidatePaymentMethods();

  return useMutation<PaymentMethod, ApiError, { id: string; changes: UpdatePaymentMethodInput }>({
    mutationFn: ({ id, changes }) =>
      http<PaymentMethod>(`/payment-methods/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(changes),
      }),
    onSuccess: invalidate,
  });
}

export function useDeletePaymentMethod() {
  const http = useHttp();
  const invalidate = useInvalidatePaymentMethods();

  // Contrato: 204 sin body (soft delete)
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => http<void>(`/payment-methods/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}
