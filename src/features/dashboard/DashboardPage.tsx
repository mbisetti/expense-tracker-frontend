import { lazy, Suspense, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CurrencyTabs } from './CurrencyTabs';
import { ConsolidatedBanner } from './ConsolidatedBanner';
import { OverviewCards } from './OverviewCards';
import { RecentTransactions } from './RecentTransactions';
import { OverviewSkeleton, ChartSkeleton, ListSkeleton } from './DashboardSkeleton';
import { useDashboardOverview } from './useDashboardOverview';
import { useMonthlySummary } from './useMonthlySummary';
import { useTransactions } from '../transactions/useTransactions';
import { BudgetSection } from '../budgets/BudgetSection';
import { SavingsGoalSection } from '../savings/SavingsGoalSection';
import { ExpectedIncomeCard } from '../income/ExpectedIncomeCard';
import { CommitmentsCard } from './CommitmentsCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { useMe } from '../auth/useMe';

const MonthlyChart = lazy(() =>
  import('./MonthlyChart').then((m) => ({ default: m.MonthlyChart })),
);

export function DashboardPage() {
  const navigate = useNavigate();
  // S46 (D9): el dashboard vacío es el primer contacto del que se registró con Google, y hasta
  // ahora no ofrecía NADA. El CTA depende de por qué está vacío: si nunca vio la guía, la guía;
  // si ya la vio (o la saltó) y sigue sin cuentas, el alta de cuenta.
  const { data: me } = useMe();
  const guidePending = me?.onboarded === false;
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
      <PageHeader title="Dashboard" />

      {isPending && <OverviewSkeleton />}

      {isError && (
        <p role="alert" className="text-expense">
          No pudimos cargar el resumen. Intentá de nuevo.
        </p>
      )}

      {data && data.byCurrency.length === 0 && (
        <EmptyState
          title="Todavía no hay datos"
          message={
            guidePending
              ? 'Te llevamos por los primeros pasos: tu moneda, tus cuentas y cuánta plata tenés hoy.'
              : 'Creá una cuenta y registrá transacciones para ver el resumen.'
          }
          actionLabel={guidePending ? 'Empezar la guía' : 'Nueva cuenta'}
          onAction={() => navigate(guidePending ? '/onboarding' : '/accounts')}
        />
      )}

      {data && overview && (
        <>
          {data.consolidated && data.byCurrency.length > 1 && (
            <ConsolidatedBanner consolidated={data.consolidated} />
          )}

          <CurrencyTabs
            currencies={data.byCurrency.map((item) => item.currency)}
            selected={overview.currency}
            onSelect={setSelectedCurrency}
          />

          <article aria-label={`Resumen ${overview.currency}`} className="flex flex-col gap-4">
            <OverviewCards overview={overview} />

            {monthly.isPending && <ChartSkeleton />}
            {monthly.isError && (
              <p role="alert" className="text-expense">
                No pudimos cargar el gráfico. Intentá de nuevo.
              </p>
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

      {/* Desktop: los pares relacionados van lado a lado (lo que entra vs lo que ya tiene
          dueño; presupuestos vs objetivos) — una sola columna de cards dejaba media pantalla
          vacía en 1024px de contenido. items-start: cada card con su alto, sin estirarse. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
        <ExpectedIncomeCard />
        {/* Al lado del esperado, que es contra lo que se mide: cuánto entra vs cuánto de eso ya
            tiene dueño. */}
        <CommitmentsCard />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
        <BudgetSection />
        <SavingsGoalSection />
      </div>

      {transactions.isPending && <ListSkeleton />}
      {transactions.isError && (
        <p role="alert" className="text-expense">
          No pudimos cargar los últimos movimientos. Intentá de nuevo.
        </p>
      )}
      {transactions.data && <RecentTransactions transactions={transactions.data.content} />}
    </section>
  );
}
