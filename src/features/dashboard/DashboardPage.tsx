import { lazy, Suspense, useState } from 'react';
import { CurrencyTabs } from './CurrencyTabs';
import { OverviewCards } from './OverviewCards';
import { RecentTransactions } from './RecentTransactions';
import { OverviewSkeleton, ChartSkeleton, ListSkeleton } from './DashboardSkeleton';
import { useDashboardOverview } from './useDashboardOverview';
import { useMonthlySummary } from './useMonthlySummary';
import { useTransactions } from '../transactions/useTransactions';

const MonthlyChart = lazy(() =>
  import('./MonthlyChart').then((m) => ({ default: m.MonthlyChart })),
);

export function DashboardPage() {
  const { data, isPending, isError } = useDashboardOverview();
  const monthly = useMonthlySummary();
  const transactions = useTransactions({ page: 0, size: 5, sort: 'date', direction: 'DESC' });

  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);
  // Si la moneda seleccionada desapareció (ej: borró esa cuenta), cae a la primera
  const overview =
    data?.byCurrency.find((item) => item.currency === selectedCurrency) ??
    data?.byCurrency[0];

  return (
    <section className="text-left flex flex-col gap-4">
      <h1>Dashboard</h1>

      {isPending && <OverviewSkeleton />}

      {isError && <p role="alert">No pudimos cargar el resumen. Intentá de nuevo.</p>}

      {data && data.byCurrency.length === 0 && (
        <p>Todavía no hay datos. Creá una cuenta y registrá transacciones para ver el resumen.</p>
      )}

      {data && overview && (
        <>
          <CurrencyTabs
            currencies={data.byCurrency.map((item) => item.currency)}
            selected={overview.currency}
            onSelect={setSelectedCurrency}
          />

          <article aria-label={`Resumen ${overview.currency}`} className="flex flex-col gap-4">
            <OverviewCards overview={overview} />

            {monthly.isPending && <ChartSkeleton />}
            {monthly.isError && (
              <p role="alert">No pudimos cargar el gráfico. Intentá de nuevo.</p>
            )}
            {monthly.data && (
              <Suspense fallback={<ChartSkeleton />}>
                <MonthlyChart
                  months={
                    monthly.data.byCurrency.find((item) => item.currency === overview.currency)
                      ?.months ?? []
                  }
                  currency={overview.currency}
                />
              </Suspense>
            )}
          </article>
        </>
      )}

      {transactions.isPending && <ListSkeleton />}
      {transactions.isError && (
        <p role="alert">No pudimos cargar los últimos movimientos. Intentá de nuevo.</p>
      )}
      {transactions.data && <RecentTransactions transactions={transactions.data.content} />}
    </section>
  );
}
