import { useQuery } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { RecurringExpense } from './api';

// Sprint 24.3: CRUD de gastos recurrentes. includeInactive=true → suma la sección "Inactivos"
// y da la definición cruda (billingDay 1-31) para editar. queryKey ['recurring-expenses'].
export function useRecurringExpenses() {
  const http = useHttp();
  return useQuery({
    queryKey: ['recurring-expenses'],
    queryFn: () => http<RecurringExpense[]>('/recurring-expenses?includeInactive=true'),
  });
}
