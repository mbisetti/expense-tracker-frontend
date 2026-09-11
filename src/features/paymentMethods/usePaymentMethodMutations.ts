import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { ApiError } from '../../lib/http';
import type { PaymentMethod, PaymentMethodType } from './api';
import type { Account } from '../accounts/api';

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
    // S50: `isDefault` es derivado del puntero de la CUENTA, así que tocar un método puede
    // cambiar lo que dicen las cuentas (y al revés). Las dos caches se invalidan juntas.
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
  };
}

/**
 * S50 (D4): el método predeterminado de una cuenta. `PUT /accounts/{id}/default-method`, 204.
 *
 * Los dos ids son excluyentes y los dos null limpian el predeterminado. El endpoint es de
 * cuentas, no de métodos, pero la mutación vive acá porque el único lugar que la usa es la
 * pantalla de métodos de pago.
 *
 * Optimista: el radio se mueve al toque. Un radio que espera al server se siente roto, y el
 * rollback es barato (el snapshot de `accounts`).
 */
export function useSetDefaultMethod() {
  const http = useHttp();
  const queryClient = useQueryClient();

  return useMutation<
    void,
    ApiError,
    { accountId: string; paymentMethodId?: string | null; cardAccountId?: string | null },
    { previous: Account[] | undefined }
  >({
    mutationFn: ({ accountId, paymentMethodId, cardAccountId }) =>
      http<void>(`/accounts/${accountId}/default-method`, {
        method: 'PUT',
        body: JSON.stringify({
          paymentMethodId: paymentMethodId ?? null,
          cardAccountId: cardAccountId ?? null,
        }),
      }),
    onMutate: async ({ accountId, paymentMethodId, cardAccountId }) => {
      await queryClient.cancelQueries({ queryKey: ['accounts'] });
      const previous = queryClient.getQueryData<Account[]>(['accounts']);
      queryClient.setQueryData<Account[]>(['accounts'], (accounts) =>
        accounts?.map((a) =>
          a.id === accountId
            ? {
                ...a,
                defaultPaymentMethodId: paymentMethodId ?? null,
                defaultCardAccountId: cardAccountId ?? null,
              }
            : a,
        ),
      );
      return { previous };
    },
    onError: (_error, _input, context) => {
      // El server dijo que no: el radio vuelve a donde estaba.
      if (context?.previous) queryClient.setQueryData(['accounts'], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
    },
  });
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
