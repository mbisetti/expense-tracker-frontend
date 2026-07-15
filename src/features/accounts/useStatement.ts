import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { Statement } from './api';

export function useStatement(accountId: string, offset: number) {
  const http = useHttp();

  return useQuery({
    queryKey: ['accounts', accountId, 'statement', offset],
    queryFn: () => http<Statement>(`/accounts/${accountId}/statement?offset=${offset}`),
    // mantiene el ciclo anterior visible al navegar offsets (sin flicker de loading),
    // igual que useTransactions
    placeholderData: keepPreviousData,
  });
}
