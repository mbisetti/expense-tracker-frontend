import { useQuery } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { PageResponse } from '../transactions/api';
import type { IncomeEntryListItem } from './api';

export function useIncomeEntries(page = 0, size = 20) {
  const http = useHttp();

  return useQuery({
    queryKey: ['income', 'entries', page, size],
    queryFn: () =>
      http<PageResponse<IncomeEntryListItem>>(`/income-entries?page=${page}&size=${size}`),
  });
}
