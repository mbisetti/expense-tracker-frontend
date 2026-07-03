import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import {
  buildTransactionsQuery,
  type PageResponse,
  type TransactionFilters,
  type TransactionListItem,
} from './api';

export function useTransactions(filters: TransactionFilters) {
  const http = useHttp();

  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: () =>
      http<PageResponse<TransactionListItem>>(
        `/transactions${buildTransactionsQuery(filters)}`,
      ),
    placeholderData: keepPreviousData,
  });
}
