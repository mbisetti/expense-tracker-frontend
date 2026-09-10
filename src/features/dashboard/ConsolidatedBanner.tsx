import { Card } from '../../components/ui/Card';
import { formatMoney } from '../../lib/money';
import { quoteLabel } from '../../lib/quoteLabel';
import type { ConsolidatedBalance } from './api';

// Banner del total consolidado a la moneda default. Deja MUY claro que es una
// estimación (el balance real vive por moneda, sin convertir).
//
// S49 (D6): cuando el "≈" pasó por el par USD/ARS, dice CON QUÉ dólar y DE QUÉ DÍA está
// calculado. Sin casa (otras monedas, o la tabla de índices todavía vacía) muestra el copy de
// siempre: no es un error, es la app de antes de S49.
export function ConsolidatedBanner({ consolidated }: { consolidated: ConsolidatedBalance }) {
  const casa = quoteLabel(consolidated.quote, consolidated.quoteDate);
  // Un solo template string y no texto partido en JSX: partido son dos nodos de texto y los
  // tests que buscan la frase entera no la encuentran (lección S47).
  const detail = casa
    ? `Al ${casa}. El balance por moneda de abajo es el real.`
    : 'Estimación con la cotización actual. El balance por moneda de abajo es el real.';

  return (
    <Card className="text-left">
      <p className="text-sm text-body">Balance total consolidado (estimado)</p>
      <p className="text-xl tabular-nums text-ink">
        ≈ {formatMoney(consolidated.amount, consolidated.currency)}
      </p>
      <p className="text-sm text-body">
        {consolidated.partial
          ? `${detail} Faltó la cotización de alguna moneda: el total es parcial.`
          : detail}
      </p>
    </Card>
  );
}
