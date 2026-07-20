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
import { InsightsSection } from './InsightsSection';
import { CategoryTransactionsModal } from './CategoryTransactionsModal';
import { deltaVsPrev } from './format';
import type { CategoryExpense, CurrencyExpenses } from './api';

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

      {data.total > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex h-2 overflow-hidden rounded-full bg-surface-sunken">
            <div className="h-2 bg-brand" style={{ width: `${essentialPct}%` }} />
            <div className="h-2 bg-expense" style={{ width: `${nonEssentialPct}%` }} />
          </div>
          <div className="flex justify-between text-sm text-body">
            <span>
              Esencial{' '}
              <span className="text-muted">
                {formatMoney(data.essentialTotal, data.currency)} · {essentialPct}%
              </span>
            </span>
            <span>
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
          <CategoryBreakdown data={current} onDrill={setDrill} />
          <section className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4">
            <h2>Evolución</h2>
            <p className="text-sm text-body">Esencial vs no esencial, últimos 6 meses</p>
            <Suspense fallback={<Skeleton variant="chart" />}>
              <EssentialTrendChart months={current.months} currency={current.currency} />
            </Suspense>
          </section>
          <InsightsSection data={current} />
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
