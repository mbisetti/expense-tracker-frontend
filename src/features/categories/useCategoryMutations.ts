import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { ApiError } from '../../lib/http';
import type { Category, CategoryType } from './api';

export type CreateCategoryInput = {
  name: string;
  type: CategoryType;
  color?: string;
  icon?: string;
};

export type UpdateCategoryInput = Partial<CreateCategoryInput>;

function useInvalidateCategories() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['categories'] });
  };
}

export function useCreateCategory() {
  const http = useHttp();
  const invalidate = useInvalidateCategories();

  return useMutation<Category, ApiError, CreateCategoryInput>({
    mutationFn: (input) =>
      http<Category>('/categories', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: invalidate,
  });
}

export function useUpdateCategory() {
  const http = useHttp();
  const invalidate = useInvalidateCategories();

  return useMutation<Category, ApiError, { id: string; changes: UpdateCategoryInput }>({
    mutationFn: ({ id, changes }) =>
      http<Category>(`/categories/${id}`, { method: 'PATCH', body: JSON.stringify(changes) }),
    onSuccess: invalidate,
  });
}

export function useDeleteCategory() {
  const http = useHttp();
  const invalidate = useInvalidateCategories();

  // Contrato: 204 sin body (soft delete)
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => http<void>(`/categories/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}
