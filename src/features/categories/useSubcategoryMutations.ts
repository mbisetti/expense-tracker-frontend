import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { ApiError } from '../../lib/http';
import type { Subcategory } from './api';

// S51: las subcategorías viajan adentro de GET /categories, así que toda operación invalida
// `categories`. `summary` porque la lupa de Gastos las nombra; `transactions` sólo cuando cambia
// lo que dice una fila (renombrar) o a qué apunta (borrar le saca la subcategoría a sus
// movimientos).
//
// Devuelve la promesa a propósito: react-query espera el onSuccess antes de resolver mutateAsync,
// así que quien la awaitea ve la lista ya refrescada (el modal suelta su orden optimista recién
// ahí y no parpadea al orden viejo).
function useInvalidate(withTransactions: boolean) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['categories'] }),
      queryClient.invalidateQueries({ queryKey: ['summary'] }),
      withTransactions ? queryClient.invalidateQueries({ queryKey: ['transactions'] }) : null,
    ]);
}

const base = (categoryId: string) => `/categories/${categoryId}/subcategories`;

export function useCreateSubcategory(categoryId: string) {
  const http = useHttp();
  const invalidate = useInvalidate(false);
  return useMutation<Subcategory, ApiError, string>({
    mutationFn: (name) =>
      http<Subcategory>(base(categoryId), { method: 'POST', body: JSON.stringify({ name }) }),
    onSuccess: invalidate,
  });
}

export function useRenameSubcategory(categoryId: string) {
  const http = useHttp();
  const invalidate = useInvalidate(true);
  return useMutation<Subcategory, ApiError, { id: string; name: string }>({
    mutationFn: ({ id, name }) =>
      http<Subcategory>(`${base(categoryId)}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name }),
      }),
    onSuccess: invalidate,
  });
}

export function useDeleteSubcategory(categoryId: string) {
  const http = useHttp();
  const invalidate = useInvalidate(true);
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => http<void>(`${base(categoryId)}/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}

// El orden completo de las vivas de la categoría; el server asigna sort_order = índice.
export function useReorderSubcategories(categoryId: string) {
  const http = useHttp();
  const invalidate = useInvalidate(false);
  return useMutation<void, ApiError, string[]>({
    mutationFn: (subcategoryIds) =>
      http<void>(`${base(categoryId)}/order`, {
        method: 'PUT',
        body: JSON.stringify({ subcategoryIds }),
      }),
    onSuccess: invalidate,
  });
}
