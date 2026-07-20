import { useState } from 'react';
import { Amount } from '../../components/ui/Amount';
import { formatMoney } from '../../lib/money';
import { growers, simulateSavings, topNonEssential } from './insights';
import type { CurrencyExpenses } from './api';

type InsightsSectionProps = {
  data: CurrencyExpenses;
};

const PRESETS = [10, 20, 30];

function catLabel(name: string | null): string {
  return name ?? 'Sin categoría';
}

// Sprint 24 (D8/FR-8): insights de "dónde recortar" — client-side sobre la respuesta.
export function InsightsSection({ data }: InsightsSectionProps) {
  const [pct, setPct] = useState(20);

  const top = topNonEssential(data.byCategory);
  const grown = growers(data.byCategory);
  const sim = simulateSavings(data.nonEssentialTotal, pct);

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4">
      <h2>Dónde recortar</h2>

      {top.length > 0 && (
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-medium text-ink">Tus mayores gastos no esenciales</h3>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {top.map((c) => (
              <li key={c.categoryId ?? 'uncat'} className="flex justify-between gap-3 text-sm">
                <span className="truncate text-body">{catLabel(c.name)}</span>
                <Amount amount={c.amount} currency={data.currency} tone="neutral" size="sm" />
              </li>
            ))}
          </ul>
        </div>
      )}

      {grown.length > 0 && (
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-medium text-ink">Crecieron vs tu promedio</h3>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {grown.map((g) => (
              <li
                key={g.category.categoryId ?? 'uncat'}
                className="flex justify-between gap-3 text-sm"
              >
                <span className="truncate text-body">{catLabel(g.category.name)}</span>
                <span className="shrink-0 text-expense">{g.growthPct}% arriba de tu promedio</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-ink">Simulá un recorte</h3>
        <div role="group" aria-label="Porcentaje de recorte" className="flex gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              aria-pressed={pct === preset}
              onClick={() => setPct(preset)}
              className={[
                'rounded-full border px-3 py-1 text-sm transition-colors',
                pct === preset
                  ? 'border-brand bg-brand/10 text-ink'
                  : 'border-line text-body hover:border-brand',
              ].join(' ')}
            >
              {preset}%
            </button>
          ))}
        </div>
        <p className="text-sm text-body">
          Recortando {pct}% de lo no esencial ahorrás{' '}
          <strong className="text-ink">{formatMoney(sim.monthly, data.currency)}</strong> por mes
          (≈ {formatMoney(sim.yearly, data.currency)} al año).
        </p>
      </div>
    </section>
  );
}
