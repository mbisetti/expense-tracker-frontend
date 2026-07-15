import { useQuery } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { ExpectedIncomeResponse } from './api';

export function useExpectedIncome() {
  const http = useHttp();
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  return useQuery({
    queryKey: ['summary', 'expectedIncome', year, month],
    queryFn: () =>
      http<ExpectedIncomeResponse>(`/summary/expected-income?month=${month}&year=${year}`),
  });
}
