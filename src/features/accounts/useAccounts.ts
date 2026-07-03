import { useQuery } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { Account } from './api';

export function useAccounts() {
  const http = useHttp();

  return useQuery({
    queryKey: ['accounts'],
    queryFn: () => http<Account[]>('/accounts'),
  });
}
