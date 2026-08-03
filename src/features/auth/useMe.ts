import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { ApiError } from '../../lib/http';
import type { Me } from './api';

// Perfil propio. La moneda favorita (defaultCurrency) se usa para el consolidado del
// dashboard y para estimar equivalencias de sub-balances en otras monedas (Sprint 22.1).
export function useMe() {
  const http = useHttp();
  return useQuery({
    queryKey: ['me'],
    queryFn: () => http<Me>('/users/me'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateMe() {
  const http = useHttp();
  const queryClient = useQueryClient();
  // PATCH parcial: se manda solo lo que cambia. S27.1 agrega `workingCurrencies`, y el
  // `setQueryData` de abajo es lo que hace que el selector de moneda se actualice al instante
  // pese al staleTime de 5 min del perfil.
  return useMutation<Me, ApiError, { defaultCurrency?: string; workingCurrencies?: string[] }>({
    mutationFn: (input) =>
      http<Me>('/users/me', { method: 'PATCH', body: JSON.stringify(input) }),
    onSuccess: (data) => {
      queryClient.setQueryData(['me'], data);
      // el total consolidado depende de la moneda favorita → refrescar el summary
      queryClient.invalidateQueries({ queryKey: ['summary'] });
    },
  });
}
