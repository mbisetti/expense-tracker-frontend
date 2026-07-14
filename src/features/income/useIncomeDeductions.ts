import { useQuery } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { IncomeDeductionResponse } from './api';

export function useIncomeDeductions(sourceId: string | undefined) {
  const http = useHttp();

  return useQuery({
    queryKey: ['income', 'deductions', sourceId],
    queryFn: () => http<IncomeDeductionResponse[]>(`/income-sources/${sourceId}/deductions`),
    enabled: !!sourceId,
  });
}
