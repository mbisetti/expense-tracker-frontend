import { useQuery } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { BudgetsSummaryResponse } from './api';

export function useBudgetsSummary() {
  const http = useHttp();

  return useQuery({
    queryKey: ['summary', 'budgets'],
    queryFn: () => http<BudgetsSummaryResponse>('/summary/budgets'),
  });
}
