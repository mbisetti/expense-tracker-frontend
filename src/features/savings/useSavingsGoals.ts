import { useQuery } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { SavingsGoalResponse } from './api';

export function useSavingsGoals() {
  const http = useHttp();

  return useQuery({
    queryKey: ['savings'],
    queryFn: () => http<SavingsGoalResponse[]>('/savings'),
  });
}
