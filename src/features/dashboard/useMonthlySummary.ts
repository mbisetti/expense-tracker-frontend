import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { MonthlyResponse } from './api';

// S49: `constant` entra en la queryKey porque son dos respuestas distintas del mismo endpoint.
// keepPreviousData para que prender el switch no haga desaparecer el gráfico y su encabezado
// mientras llega la respuesta nueva: los números cambian, el switch no parpadea.
export function useMonthlySummary(constant = false) {
  const http = useHttp();

  return useQuery({
    queryKey: ['summary', 'monthly', constant],
    queryFn: () => http<MonthlyResponse>(`/summary/monthly?constant=${constant}`),
    placeholderData: keepPreviousData,
  });
}
