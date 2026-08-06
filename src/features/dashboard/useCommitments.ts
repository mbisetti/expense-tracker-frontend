import { useQuery } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { Commitments } from './api';

// Cuelga de ['summary'] a propósito: anotar un gasto no lo cambia, pero pagar una cuota,
// configurar un préstamo o tocar un recurrente sí — y todos esos caminos ya invalidan ['summary'].
export function useCommitments(year: number, month: number) {
  const http = useHttp();
  return useQuery({
    queryKey: ['summary', 'commitments', year, month],
    queryFn: () => http<Commitments>(`/summary/commitments?year=${year}&month=${month}`),
  });
}
