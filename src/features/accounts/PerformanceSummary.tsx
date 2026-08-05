import { Button } from '../../components/ui/Button';
import { formatMoney } from '../../lib/money';
import { useAccountPerformance } from './useAccountPerformance';
import type { Account } from './api';

type PerformanceSummaryProps = {
  account: Account;
  onOpenDetail: () => void;
};

// S40 (D3): la línea de rendimiento en la card de una inversión.
//
// **Nunca el mes suelto.** Feedback textual de Marko: "rendir en un mes me parece medio al pedo,
// puede bajar un montón y te deprime; hacelo en varios meses". La card muestra 6 meses y, si hay
// historia suficiente, la proyección a un año. El desglose mes a mes vive en el detalle.
export function PerformanceSummary({ account, onOpenDetail }: PerformanceSummaryProps) {
  const { data } = useAccountPerformance(account.id);

  // La principal viene primera del server (mismo criterio que balances[]). Las otras monedas
  // están en el detalle: meter tres líneas en la card la vuelve ilegible.
  const principal = data?.currencies?.[0];
  if (!principal) return null;

  const positive = principal.windowYield >= 0;

  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <p className="text-sm text-body">
        {principal.windowYield === 0 ? 'Sin rendimiento en ' : 'Rindió '}
        {principal.windowYield !== 0 && (
          <span className={`font-semibold tabular-nums ${positive ? 'text-income' : 'text-expense'}`}>
            {formatMoney(principal.windowYield, principal.currency)}
          </span>
        )}
        {principal.windowYield === 0 ? '' : ' en '}
        los últimos {principal.windowMonths} meses
        {principal.projection && (
          <>
            {' · si sigue así: ≈'}
            <span className="tabular-nums text-ink">
              {formatMoney(principal.projection.projectedBalance, principal.currency)}
            </span>
            {' en un año'}
          </>
        )}
      </p>
      <Button type="button" variant="ghost" size="sm" onClick={onOpenDetail}>
        Ver detalle
      </Button>
    </div>
  );
}
