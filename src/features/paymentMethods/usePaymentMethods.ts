import { useQuery } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { PaymentMethod } from './api';

export function usePaymentMethods() {
  const http = useHttp();

  return useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => http<PaymentMethod[]>('/payment-methods'),
  });
}
