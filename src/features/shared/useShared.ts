import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { ApiError } from '../../lib/http';
import type {
  Person,
  PersonDebtInput,
  PersonDebtItem,
  PersonDebts,
  SettleDebtInput,
  SettleInput,
  SharedExpense,
  SharedSummary,
  ShareInput,
} from './api';
import type { TransactionResponse } from '../transactions/api';

// El resumen de compartidos NO lleva año/mes (la deuda es acumulada), así que va con key propia
// y no cuelga de ['summary', year, month]: si colgara, cambiar de mes en la tab Gastos dispararía
// una request de más cada vez para traer exactamente lo mismo.
const SHARED_SUMMARY_KEY = ['summary', 'shared'];

// Cobrar mueve el saldo de una cuenta → invalidar ['accounts'] no es opcional. Repartir cambia
// cuánto cuenta el gasto → ['summary'] tampoco.
function useInvalidateShared() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    queryClient.invalidateQueries({ queryKey: ['summary'] });
    queryClient.invalidateQueries({ queryKey: ['shares'] });
  };
}

export function usePeople() {
  const http = useHttp();
  return useQuery({
    queryKey: ['people'],
    queryFn: () => http<Person[]>('/people'),
  });
}

// Alta al vuelo: el backend devuelve la persona existente (200) si el nombre ya está tomado, así
// que tipear "juan" teniendo "Juan" nunca falla.
export function useCreatePerson() {
  const http = useHttp();
  const queryClient = useQueryClient();

  return useMutation<Person, ApiError, string>({
    mutationFn: (name) =>
      http<Person>('/people', { method: 'POST', body: JSON.stringify({ name }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['people'] }),
  });
}

export function useUpdatePerson() {
  const http = useHttp();
  const queryClient = useQueryClient();

  return useMutation<Person, ApiError, { id: string; name: string }>({
    mutationFn: ({ id, name }) =>
      http<Person>(`/people/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['people'] }),
  });
}

export function useDeletePerson() {
  const http = useHttp();
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: (id) => http<void>(`/people/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['people'] }),
  });
}

export function useShares(transactionId: string | undefined) {
  const http = useHttp();
  return useQuery({
    queryKey: ['shares', transactionId],
    queryFn: () => http<SharedExpense>(`/transactions/${transactionId}/shares`),
    enabled: Boolean(transactionId),
  });
}

// PUT del reparto entero: lista vacía = descompartir.
export function useReplaceShares() {
  const http = useHttp();
  const invalidate = useInvalidateShared();

  return useMutation<SharedExpense, ApiError, { transactionId: string; shares: ShareInput[] }>({
    mutationFn: ({ transactionId, shares }) =>
      http<SharedExpense>(`/transactions/${transactionId}/shares`, {
        method: 'PUT',
        body: JSON.stringify({ shares }),
      }),
    onSuccess: invalidate,
  });
}

// El tick. El monto no viaja: lo pone el server desde la parte.
export function useSettleShare() {
  const http = useHttp();
  const invalidate = useInvalidateShared();

  return useMutation<TransactionResponse, ApiError, { shareId: string; input: SettleInput }>({
    mutationFn: ({ shareId, input }) =>
      http<TransactionResponse>(`/shares/${shareId}/settle`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });
}

export function useUnsettleShare() {
  const http = useHttp();
  const invalidate = useInvalidateShared();

  return useMutation<void, ApiError, string>({
    mutationFn: (shareId) => http<void>(`/shares/${shareId}/settle`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}

export function useSharedSummary() {
  const http = useHttp();
  return useQuery({
    queryKey: SHARED_SUMMARY_KEY,
    queryFn: () => http<SharedSummary>('/summary/shared'),
  });
}

// ── S40 (Bloque C): "Debés" ─────────────────────────────────────────────────────────────────

// Misma razón que SHARED_SUMMARY_KEY para no colgar de ['summary', year, month]: la deuda es
// acumulada y cambiar de mes en la tab Gastos no la cambia.
const PERSON_DEBTS_KEY = ['person-debts'];

// Anotar una deuda crea un GASTO REAL (mueve el mes, la categoría y el presupuesto) en una
// cuenta que puede haber nacido recién → hay que invalidar todo, incluidas ['accounts'] por la
// cuenta sistema nueva. Saldarla mueve el saldo de otra cuenta. Ninguna de las dos es barata.
function useInvalidateDebts() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: PERSON_DEBTS_KEY });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    queryClient.invalidateQueries({ queryKey: ['summary'] });
    queryClient.invalidateQueries({ queryKey: ['expenses'] });
  };
}

export function usePersonDebts() {
  const http = useHttp();
  return useQuery({
    queryKey: PERSON_DEBTS_KEY,
    queryFn: () => http<PersonDebts>('/person-debts'),
  });
}

export function useCreatePersonDebt() {
  const http = useHttp();
  const invalidate = useInvalidateDebts();

  return useMutation<PersonDebtItem, ApiError, PersonDebtInput>({
    mutationFn: (input) =>
      http<PersonDebtItem>('/person-debts', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: invalidate,
  });
}

// El monto no viaja: lo pone el server desde el gasto de la deuda.
export function useSettlePersonDebt() {
  const http = useHttp();
  const invalidate = useInvalidateDebts();

  return useMutation<PersonDebtItem, ApiError, { debtId: string; input: SettleDebtInput }>({
    mutationFn: ({ debtId, input }) =>
      http<PersonDebtItem>(`/person-debts/${debtId}/settle`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });
}

export function useUnsettlePersonDebt() {
  const http = useHttp();
  const invalidate = useInvalidateDebts();

  return useMutation<void, ApiError, string>({
    mutationFn: (debtId) => http<void>(`/person-debts/${debtId}/settle`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}

// Borra la deuda Y su gasto. Con la deuda ya saldada el server responde 409: primero se deshace.
export function useDeletePersonDebt() {
  const http = useHttp();
  const invalidate = useInvalidateDebts();

  return useMutation<void, ApiError, string>({
    mutationFn: (debtId) => http<void>(`/person-debts/${debtId}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}
