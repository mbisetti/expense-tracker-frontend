import { useDashboardOverview } from './useDashboardOverview';

export function DashboardPage() {
  const { data, isPending, isError } = useDashboardOverview();

  const formatMoney = (amount: number, currency: string) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);

  return (
    <section>
      <h1>Dashboard</h1>

      {isPending && <p>Cargando resumen...</p>}

      {isError && <p role="alert">No pudimos cargar el resumen. Intentá de nuevo.</p>}

      {data && data.byCurrency.length === 0 && (
        <p>Todavía no hay datos. Creá una cuenta y registrá transacciones para ver el resumen.</p>
      )}

      {data?.byCurrency.map((overview) => (
        <article key={overview.currency} aria-label={`Resumen ${overview.currency}`}>
          <h2>{overview.currency}</h2>
          <dl>
            <dt>Balance total</dt>
            <dd>{formatMoney(overview.totalBalance, overview.currency)}</dd>
            <dt>Ingresos del mes</dt>
            <dd>{formatMoney(overview.monthIncome, overview.currency)}</dd>
            <dt>Gastos del mes</dt>
            <dd>{formatMoney(overview.monthExpense, overview.currency)}</dd>
          </dl>
        </article>
      ))}
    </section>
  );
}
