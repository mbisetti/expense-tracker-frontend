import { formatMoney } from '../../lib/money';
import type { ConsolidatedBalance } from './api';

// Banner del total consolidado a la moneda default. Deja MUY claro que es una
// estimación (el balance real vive por moneda, sin convertir).
export function ConsolidatedBanner({ consolidated }: { consolidated: ConsolidatedBalance }) {
  return (
    <div className="rounded border border-line bg-surface p-3 text-left">
      <p className="text-body text-sm">Balance total consolidado (estimado)</p>
      <p className="text-ink text-xl tabular-nums">
        ≈ {formatMoney(consolidated.amount, consolidated.currency)}
      </p>
      <p className="text-body text-sm">
        Estimación con la cotización actual — el balance por moneda de abajo es el real.
        {consolidated.partial && ' Faltó la cotización de alguna moneda: el total es parcial.'}
      </p>
    </div>
  );
}
