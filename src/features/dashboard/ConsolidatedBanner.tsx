import { Card } from '../../components/ui/Card';
import { formatMoney } from '../../lib/money';
import type { ConsolidatedBalance } from './api';

// Banner del total consolidado a la moneda default. Deja MUY claro que es una
// estimación (el balance real vive por moneda, sin convertir).
export function ConsolidatedBanner({ consolidated }: { consolidated: ConsolidatedBalance }) {
  return (
    <Card className="text-left">
      <p className="text-sm text-body">Balance total consolidado (estimado)</p>
      <p className="text-xl tabular-nums text-ink">
        ≈ {formatMoney(consolidated.amount, consolidated.currency)}
      </p>
      <p className="text-sm text-body">
        Estimación con la cotización actual. El balance por moneda de abajo es el real.
        {consolidated.partial && ' Faltó la cotización de alguna moneda: el total es parcial.'}
      </p>
    </Card>
  );
}
