import { useState } from 'react';
import { CurrencyTabs } from './CurrencyTabs';
import { MonthlyChart } from './MonthlyChart';
import { OverviewCards } from './OverviewCards';
import { RecentTransactions } from './RecentTransactions';
import { useDashboardOverview } from './useDashboardOverview';
import { useMonthlySummary } from './useMonthlySummary';
import { useTransactions } from '../transactions/useTransactions';

export function DashboardPage() {
  const { data, isPending, isError } = useDashboardOverview();
  const monthly = useMonthlySummary();
  const transactions = useTransactions({ page: 0, size: 5, sort: 'date', direction: 'DESC' });

  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);
  const effectiveCurrency = selectedCurrency ?? data?.byCurrency[0]?.currency;
  const overview = data?.byCurrency.find((item) => item.currency === effectiveCurrency);

  return (
    <section className="text-left flex flex-col gap-4">
      <h1>Dashboard</h1>

      {isPending && <p>Cargando resumen...</p>}

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

            {monthly.isPending && <p>Cargando gráfico...</p>}
            {monthly.data && (
              <MonthlyChart
                months={
                  monthly.data.byCurrency.find((item) => item.currency === overview.currency)
                    ?.months ?? []
                }
                currency={overview.currency}
              />
            )}
          </article>
        </>
      )}

      {transactions.isPending && <p>Cargando movimientos...</p>}
      {transactions.data && <RecentTransactions transactions={transactions.data.content} />}
    </section>
  );
}
