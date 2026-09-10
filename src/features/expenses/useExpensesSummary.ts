import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { ExpensesSummary } from './api';

// Sprint 24: análisis de gastos del mes pedido (ventana de 6 meses). queryKey bajo ['summary']
// para que las mutaciones de categoría (que invalidan ['summary']) refresquen la tab.
// S49: `constant` entra en la queryKey (son dos respuestas distintas del mismo endpoint) y
// keepPreviousData evita que la pantalla entera se caiga a un skeleton al prender el switch.
export function useExpensesSummary(year: number, month: number, constant = false) {
  const http = useHttp();
  return useQuery({
    queryKey: ['summary', 'expenses', year, month, constant],
    queryFn: () =>
      http<ExpensesSummary>(`/summary/expenses?year=${year}&month=${month}&constant=${constant}`),
    placeholderData: keepPreviousData,
  });
}
