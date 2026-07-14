import { useQuery } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { PageResponse } from '../transactions/api';
import type { TransferListItem } from './api';

export function useTransfers(page = 0, size = 20) {
  const http = useHttp();

  return useQuery({
    queryKey: ['transfers', page, size],
    queryFn: () => http<PageResponse<TransferListItem>>(`/transfers?page=${page}&size=${size}`),
  });
}
