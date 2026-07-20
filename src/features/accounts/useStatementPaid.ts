import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { ApiError } from '../../lib/http';

// Sprint 22.3/22.4: marca/paga (PUT) y desmarca/deshace (DELETE) el resumen de un ciclo
// (identificado por su periodEnd derivado). Invalidar `['accounts']` alcanza los statements
// (son sub-queries), los saldos de las cuentas (el pago mueve plata) y todo lo derivado;
// `['summary']` refresca el dashboard (los flujos del mes cambian).
function useInvalidateAfterPaid() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    queryClient.invalidateQueries({ queryKey: ['summary'] });
  };
}

// `pay=false` = marca cosmética; `pay=true` = pago real (transfer madre→tarjeta). El monto
// lo calcula el server (el client nunca lo manda).
export function useMarkStatementPaid(accountId: string) {
  const http = useHttp();
  const invalidate = useInvalidateAfterPaid();

  return useMutation<void, ApiError, { periodEnd: string; pay: boolean }>({
    mutationFn: ({ periodEnd, pay }) =>
      http<void>(`/accounts/${accountId}/statement/paid`, {
        method: 'PUT',
        body: JSON.stringify({ periodEnd, pay }),
      }),
    onSuccess: invalidate,
  });
}

export function useUnmarkStatementPaid(accountId: string) {
  const http = useHttp();
  const invalidate = useInvalidateAfterPaid();

  return useMutation<void, ApiError, { periodEnd: string }>({
    mutationFn: ({ periodEnd }) =>
      http<void>(`/accounts/${accountId}/statement/paid?periodEnd=${periodEnd}`, {
        method: 'DELETE',
      }),
    onSuccess: invalidate,
  });
}
