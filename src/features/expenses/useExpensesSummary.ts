import { useQuery } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { ExpensesSummary } from './api';

// Sprint 24: análisis de gastos del mes pedido (ventana de 6 meses). queryKey bajo ['summary']
// para que las mutaciones de categoría (que invalidan ['summary']) refresquen la tab.
export function useExpensesSummary(year: number, month: number) {
  const http = useHttp();
  return useQuery({
    queryKey: ['summary', 'expenses', year, month],
    queryFn: () => http<ExpensesSummary>(`/summary/expenses?year=${year}&month=${month}`),
  });
}
