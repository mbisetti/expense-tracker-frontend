import { useState } from 'react';
import { Amount } from '../../components/ui/Amount';
import { formatMoney } from '../../lib/money';
import { growers, peakStory, simulateSavings, topNonEssential, type Grower } from './insights';
import type { CurrencyExpenses, EssentialMonthBucket } from './api';

type InsightsSectionProps = {
  data: CurrencyExpenses;
  /** Ventana ya recortada (post trimLeadingEmpty) — para la historia del pico. */
  months: EssentialMonthBucket[];
  /** 'YYYY-MM' del mes seleccionado. */
  selectedMonth: string;
};

const PRESETS = [10, 20, 30];

function catLabel(name: string | null): string {
  return name ?? 'Sin categoría';
}

// Copy del grower según su clasificación (S24.2 E): compra puntual = explicación (text-body);
// conductual y % = alarma (text-expense).
function growerCopy(g: Grower, currency: string) {
  if (g.kind === 'punctual') {
    return { text: `Compra puntual de ${formatMoney(g.maxTxAmount, currency)}`, alarm: false };
  }
  if (g.kind === 'behavioral') {
    return { text: `${g.extraCount} compras más que tu promedio`, alarm: true };
  }
  return { text: `${g.growthPct}% arriba de tu promedio`, alarm: true };
}

// Sprint 24 (D8/FR-8) + S24.2 (E): insights de "dónde recortar" — client-side sobre la respuesta.
export function InsightsSection({ data, months, selectedMonth }: InsightsSectionProps) {
  const [pct, setPct] = useState(20);

  const peak = peakStory(months, data.byCategory, selectedMonth);
  const top = topNonEssential(data.byCategory);
  const grown = growers(data.byCategory, data.avg3mTotal);
  const sim = simulateSavings(data.nonEssentialTotal, pct);

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4">
      <h2>Dónde recortar</h2>

      {peak && (
        <p className="text-sm text-body">
          Tu mes más alto de la ventana, empujado por{' '}
          <span className="text-ink">{catLabel(peak.topName)}</span> (
          {formatMoney(peak.topAmount, data.currency)}).
        </p>
      )}

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
            {grown.map((g) => {
              const copy = growerCopy(g, data.currency);
              return (
                <li
                  key={g.category.categoryId ?? 'uncat'}
                  className="flex justify-between gap-3 text-sm"
                >
                  <span className="truncate text-body">{catLabel(g.category.name)}</span>
                  <span className={`shrink-0 ${copy.alarm ? 'text-expense' : 'text-body'}`}>
                    {copy.text}
                  </span>
                </li>
              );
            })}
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
          <strong className="tabular-nums text-ink">{formatMoney(sim.monthly, data.currency)}</strong>{' '}
          por mes (≈ {formatMoney(sim.yearly, data.currency)} al año).
        </p>
      </div>
    </section>
  );
}
