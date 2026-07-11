import { useQuery } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { MonthlyResponse } from './api';

export function useMonthlySummary() {
  const http = useHttp();

  return useQuery({
    queryKey: ['summary', 'monthly'],
    queryFn: () => http<MonthlyResponse>('/summary/monthly'),
  });
}
