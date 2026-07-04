import { useQuery } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { OverviewResponse } from './api';

export function useDashboardOverview() {
  const http = useHttp();

  return useQuery({
    queryKey: ['summary', 'overview'],
    queryFn: () => http<OverviewResponse>('/summary/overview'),
  });
}
