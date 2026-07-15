import { useQuery } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { ExchangeRateResult } from './api';

// Cotización sugerida para pre-llenar el monto de destino en un transfer cross-currency.
// Solo corre si las monedas difieren. staleTime 1h = el mismo TTL del cache del backend.
export function useExchangeRate(base: string | undefined, target: string | undefined) {
  const http = useHttp();

  return useQuery({
    queryKey: ['exchangeRate', base, target],
    queryFn: () =>
      http<ExchangeRateResult>(`/exchange-rates?base=${base}&target=${target}`),
    enabled: !!base && !!target && base !== target,
    staleTime: 60 * 60 * 1000,
  });
}
