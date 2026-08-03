import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { ApiError } from '../../lib/http';

// Sprint 22.3/22.4: marca/paga (PUT) y desmarca/deshace (DELETE) el resumen de un ciclo
// (identificado por su periodEnd derivado). Invalidar `['accounts']` alcanza los statements
// (son sub-queries), los saldos de las cuentas (el pago mueve plata) y todo lo derivado;
// `['summary']` refresca el dashboard (los flujos del mes cambian).
//
// Hallazgo F4: faltaban `['transactions']` y `['transfers']`. Con `pay: true` esto crea una
// TRANSFERENCIA REAL madre→tarjeta, o sea DOS transactions nuevas en el ledger — y el feed de
// Movimientos no se enteraba. Todas las demás mutaciones que mueven plata (transactions,
// transfers, income, import, shared, recurring) ya invalidaban el feed; esta era la única que no.
//
// No se notaba porque el staleTime default de 0 hace que navegar a Movimientos remonte la query
// y refetchee igual: un bug tapaba al otro (RESUMEN.md §5.2).
function useInvalidateAfterPaid() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    queryClient.invalidateQueries({ queryKey: ['summary'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['transfers'] });
  };
}

// Sprint 27: la marca/pago es de UN RENGLÓN (ciclo + moneda), no del ciclo entero.
//   `pay=false` = marca cosmética; `pay=true` = pago real (transfer madre→tarjeta).
//   Misma moneda: el monto lo calcula el server si no se manda (el caso de un tap).
//   Cross-currency (`fromCurrency` distinta): van LOS DOS montos y son obligatorios —
//   `fromAmount` es cuánto SALE de la cuenta y `amount` cuánta DEUDA CANCELA. La app no
//   calcula el tipo de cambio: lo registra, y adentro de esos dos números quedan absorbidos
//   el spread del banco y los impuestos, que no son conocibles de antemano.
export type MarkStatementPaidVars = {
  periodEnd: string;
  currency: string;
  pay: boolean;
  fromCurrency?: string;
  fromAmount?: number;
  amount?: number;
};

export function useMarkStatementPaid(accountId: string) {
  const http = useHttp();
  const invalidate = useInvalidateAfterPaid();

  return useMutation<void, ApiError, MarkStatementPaidVars>({
    mutationFn: (vars) =>
      http<void>(`/accounts/${accountId}/statement/paid`, {
        method: 'PUT',
        body: JSON.stringify(vars),
      }),
    onSuccess: invalidate,
  });
}

export function useUnmarkStatementPaid(accountId: string) {
  const http = useHttp();
  const invalidate = useInvalidateAfterPaid();

  return useMutation<void, ApiError, { periodEnd: string; currency: string }>({
    mutationFn: ({ periodEnd, currency }) =>
      http<void>(
        `/accounts/${accountId}/statement/paid?periodEnd=${periodEnd}&currency=${currency}`,
        { method: 'DELETE' },
      ),
    onSuccess: invalidate,
  });
}
