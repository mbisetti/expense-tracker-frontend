import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { ApiError } from '../../lib/http';
import type { Account, AccountType, LoanInput } from './api';

export type CreateAccountInput = {
  name: string;
  type: AccountType;
  currency: string;
  isInformal?: boolean;
  statementCloseDay?: number;
  paymentDueDay?: number;
  // Sprint 22.2: institución (D4) y madre de una tarjeta CREDIT (D2). En create el
  // linkedAccountId es un UUID directo.
  institution?: string;
  linkedAccountId?: string;
} & LoanInput;

export type UpdateAccountInput = {
  name?: string;
  type?: AccountType;
  currency?: string;
  isInformal?: boolean;
  statementCloseDay?: number;
  paymentDueDay?: number;
  // Sprint 22.2 (D8): institution/linkedAccountId — string vacío ("") = borrar/desvincular;
  // ausente = no tocar.
  institution?: string;
  linkedAccountId?: string;
} & LoanInput;

function useInvalidateAccounts() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    queryClient.invalidateQueries({ queryKey: ['summary'] });
  };
}

export function useCreateAccount() {
  const http = useHttp();
  const invalidate = useInvalidateAccounts();

  return useMutation<Account, ApiError, CreateAccountInput>({
    mutationFn: (input) =>
      http<Account>('/accounts', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: invalidate,
  });
}

export function useUpdateAccount() {
  const http = useHttp();
  const invalidate = useInvalidateAccounts();

  return useMutation<Account, ApiError, { id: string; changes: UpdateAccountInput }>({
    mutationFn: ({ id, changes }) =>
      http<Account>(`/accounts/${id}`, { method: 'PATCH', body: JSON.stringify(changes) }),
    onSuccess: invalidate,
  });
}

export function useDeleteAccount() {
  const http = useHttp();
  const invalidate = useInvalidateAccounts();

  // Contrato: DELETE responde 204 sin body (distinto de transactions, que devuelve 200+body)
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => http<void>(`/accounts/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}

// Sprint 22.4: reordena las cuentas top-level. Body = el orden completo de ids; el server
// asigna sort_order = índice. Invalida accounts para que la página de atrás se reordene en
// vivo (el modal mantiene su propio estado optimista). El modal serializa los PUT.
export function useReorderAccounts() {
  const http = useHttp();
  const invalidate = useInvalidateAccounts();

  return useMutation<void, ApiError, string[]>({
    mutationFn: (accountIds) =>
      http<void>('/accounts/order', { method: 'PUT', body: JSON.stringify({ accountIds }) }),
    onSuccess: invalidate,
  });
}
