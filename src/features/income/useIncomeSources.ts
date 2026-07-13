import { useQuery } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { IncomeSourceResponse } from './api';

export function useIncomeSources() {
  const http = useHttp();

  return useQuery({
    queryKey: ['income', 'sources'],
    queryFn: () => http<IncomeSourceResponse[]>('/income-sources'),
  });
}
