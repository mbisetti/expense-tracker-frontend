import { useQuery } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { Category } from './api';

export function useCategories() {
  const http = useHttp();

  return useQuery({
    queryKey: ['categories'],
    queryFn: () => http<Category[]>('/categories'),
  });
}
