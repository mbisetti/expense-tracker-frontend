import { useQuery } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { PaymentMethod } from './api';

// accountId opcional: si viene, trae sólo los métodos de esa cuenta (el form de transacción
// filtra por la cuenta elegida). Sin él, todos los del usuario (la página de gestión).
export function usePaymentMethods(accountId?: string) {
  const http = useHttp();

  return useQuery({
    queryKey: ['payment-methods', accountId ?? 'all'],
    queryFn: () =>
      http<PaymentMethod[]>(`/payment-methods${accountId ? `?accountId=${accountId}` : ''}`),
  });
}
