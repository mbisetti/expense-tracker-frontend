import { lazy, Suspense, useState } from 'react';
import { CurrencyTabs } from '../dashboard/CurrencyTabs';
import { Amount } from '../../components/ui/Amount';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { useMe } from '../auth/useMe';
import { formatMoney } from '../../lib/money';
import { useExpensesSummary } from './useExpensesSummary';
import { PeriodNav } from './PeriodNav';
import { CategoryBreakdown } from './CategoryBreakdown';
import { RecurringSection } from './RecurringSection';
import { InsightsSection } from './InsightsSection';
import { CategoryTransactionsModal } from './CategoryTransactionsModal';
import { deltaVsPrev } from './format';
import { trimLeadingEmpty } from './insights';
import type { CategoryExpense, CurrencyExpenses } from './api';

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

// Recharts lazy (patrón MonthlyChart): no engordar el bundle inicial.
const EssentialTrendChart = lazy(() =>
  import('./EssentialTrendChart').then((m) => ({ default: m.EssentialTrendChart })),
);

function currentPeriod(): { year: number; month: number } {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

// Resumen del mes: total (Amount lg) + delta vs mes anterior + split esencial/no esencial
// (montos, % y barra de dos segmentos). Markup local, no hace falta un componente genérico.
function MonthSummary({ data }: { data: CurrencyExpenses }) {
  const delta = deltaVsPrev(data.total, data.prevMonthTotal);
  const essentialPct = data.total > 0 ? Math.round((data.essentialTotal / data.total) * 100) : 0;
  const nonEssentialPct = data.total > 0 ? 100 - essentialPct : 0;

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-sm text-muted">Gastado este mes</span>
          <Amount amount={data.total} currency={data.currency} tone="neutral" size="xl" />
        </div>
        {delta.direction !== 'flat' && (
          <span
            className={
              delta.direction === 'up' || delta.direction === 'new' ? 'text-expense' : 'text-income'
            }
          >
            {delta.direction === 'up' ? '↑' : delta.direction === 'down' ? '↓' : ''} {delta.text}{' '}
            <span className="text-muted">vs mes anterior</span>
          </span>
        )}
      </div>

      {/* Proyección MTD (S24.2 E): solo en el mes corriente (el backend manda projectedTotal
          únicamente ahí). "A este ritmo…" + comparación con el mes pasado si aplica. */}
      {data.projectedTotal != null && (
        <p className="text-sm text-body">
          A este ritmo terminás el mes en{' '}
          <span className="tabular-nums text-ink">
            ~{formatMoney(data.projectedTotal, data.currency)}
          </span>
          {data.prevMonthTotal > 0 && (
            <>
              {' '}
              <span className="text-muted">
                (el mes pasado: {formatMoney(data.prevMonthTotal, data.currency)})
              </span>
            </>
          )}
        </p>
      )}

      {data.total > 0 && (
        <div className="flex flex-col gap-1.5">
          {/* S24.2 A.1: esencial = ink (el "negro" temático), no esencial = ámbar. Ni rojo
              (atado a "malo") ni verde (es ingreso). */}
          <div className="flex h-2 overflow-hidden rounded-full bg-surface-sunken">
            <div className="h-2 bg-ink" style={{ width: `${essentialPct}%` }} />
            <div className="h-2 bg-warning" style={{ width: `${nonEssentialPct}%` }} />
          </div>
          <div className="flex justify-between text-sm text-body">
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-ink" />
              Esencial{' '}
              <span className="text-muted">
                {formatMoney(data.essentialTotal, data.currency)} · {essentialPct}%
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-warning" />
              No esencial{' '}
              <span className="text-muted">
                {formatMoney(data.nonEssentialTotal, data.currency)} · {nonEssentialPct}%
              </span>
            </span>
          </div>
        </div>
      )}
    </section>
  );
}

export function ExpensesPage() {
  const [period, setPeriod] = useState(currentPeriod);
  const [picked, setPicked] = useState<string | null>(null);
  const [drill, setDrill] = useState<CategoryExpense | null>(null);

  const { data: me } = useMe();
  const { data, isPending, isError } = useExpensesSummary(period.year, period.month);

  const now = currentPeriod();
  const canGoNext = period.year < now.year || (period.year === now.year && period.month < now.month);

  const goPrev = () => {
    setDrill(null);
    setPeriod((p) => (p.month === 1 ? { year: p.year - 1, month: 12 } : { ...p, month: p.month - 1 }));
  };
  const goNext = () => {
    if (!canGoNext) return;
    setDrill(null);
    setPeriod((p) => (p.month === 12 ? { year: p.year + 1, month: 1 } : { ...p, month: p.month + 1 }));
  };

  const currencies = data?.byCurrency.map((c) => c.currency) ?? [];
  // Moneda activa sin useEffect: la elegida si sigue existiendo; si no, la favorita; si no, la
  // primera. Al navegar meses, si la elegida desaparece, cae sola al fallback.
  const active =
    picked && currencies.includes(picked)
      ? picked
      : me?.defaultCurrency && currencies.includes(me.defaultCurrency)
        ? me.defaultCurrency
        : (currencies[0] ?? '');
  const current = data?.byCurrency.find((c) => c.currency === active);

  return (
    <section className="flex flex-col gap-4 text-left">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1>Gastos</h1>
        <PeriodNav
          year={period.year}
          month={period.month}
          onPrev={goPrev}
          onNext={goNext}
          canGoNext={canGoNext}
        />
      </div>

      {currencies.length > 1 && (
        <CurrencyTabs currencies={currencies} selected={active} onSelect={setPicked} />
      )}

      {isPending && <Skeleton variant="card" />}

      {isError && (
        <p role="alert" className="text-expense">
          No pudimos cargar los gastos. Intentá de nuevo.
        </p>
      )}

      {!isPending && !isError && currencies.length === 0 && (
        <EmptyState title="No hay gastos en este período." />
      )}

      {current && (
        <>
          <MonthSummary data={current} />
          {/* key por mes+moneda: resetea el triple toggle y "Ver todos" al navegar (S24.2 B). */}
          <CategoryBreakdown
            key={`${monthKey(period.year, period.month)}-${active}`}
            data={current}
            onDrill={setDrill}
          />
          <section className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4">
            <h2>Evolución</h2>
            <p className="text-sm text-body">Esencial vs no esencial, últimos 6 meses</p>
            <Suspense fallback={<Skeleton variant="chart" />}>
              {/* S24.2 (C): sin meses fantasma al inicio + mes seleccionado resaltado. */}
              <EssentialTrendChart
                months={trimLeadingEmpty(current.months)}
                currency={current.currency}
                selectedMonth={monthKey(period.year, period.month)}
              />
            </Suspense>
          </section>
          <RecurringSection data={current} />
          <InsightsSection
            data={current}
            months={trimLeadingEmpty(current.months)}
            selectedMonth={monthKey(period.year, period.month)}
          />
        </>
      )}

      {drill && current && (
        <CategoryTransactionsModal
          category={drill}
          currency={current.currency}
          year={period.year}
          month={period.month}
          onClose={() => setDrill(null)}
        />
      )}
    </section>
  );
}
