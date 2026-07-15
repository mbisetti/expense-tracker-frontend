import { Card } from '../../components/Card';
import { ProgressBar } from '../../components/ProgressBar';
import { PlaceholderRow } from '../../components/SectionPlaceholder';
import { formatMoney } from '../../lib/money';
import { budgetStatus } from './api';
import { useBudgetsSummary } from './useBudgetsSummary';

const STATUS_LABEL: Record<'ok' | 'warning' | 'exceeded', string> = {
  ok: 'En presupuesto',
  warning: 'Cerca del límite',
  exceeded: 'Excedido',
};

const STATUS_CLASSES: Record<'ok' | 'warning' | 'exceeded', string> = {
  ok: 'text-body',
  warning: 'text-warning',
  exceeded: 'text-expense',
};

const STATUS_TONE: Record<'ok' | 'warning' | 'exceeded', 'brand' | 'warning' | 'expense'> = {
  ok: 'brand',
  warning: 'warning',
  exceeded: 'expense',
};

export function BudgetSection() {
  const { data, isPending, isError } = useBudgetsSummary();

  return (
    <Card>
      <h2>Presupuestos del mes</h2>

      {isPending && (
        <div role="status" aria-label="Cargando presupuestos" className="flex flex-col gap-3 animate-pulse">
          <PlaceholderRow />
          <PlaceholderRow />
          <PlaceholderRow />
        </div>
      )}

      {isError && <p role="alert">No pudimos cargar los presupuestos. Intentá de nuevo.</p>}

      {data && data.budgets.length === 0 && <p>No definiste presupuestos este mes.</p>}

      {data && data.budgets.length > 0 && (
        <ul className="list-none p-0 m-0 flex flex-col gap-3">
          {data.budgets.map((budget) => {
            const status = budgetStatus(budget.spentAmount, budget.limitAmount);
            const ratio = budget.limitAmount > 0 ? budget.spentAmount / budget.limitAmount : 0;
            const markerRatio =
              budget.limitAmount > 0 ? budget.projectedEndOfMonth / budget.limitAmount : 0;
            // Regla "no alarmar temprano": antes del día 7 del mes, la proyección es
            // volátil (pocos días de datos), así que se muestra neutra aunque ya
            // marque will_exceed.
            const dayOfMonth = new Date().getDate();
            const isAlarm = budget.projectedStatus === 'will_exceed' && dayOfMonth >= 7;

            return (
              <li key={budget.budgetId}>
                <div className="flex justify-between items-baseline gap-2">
                  <span className="text-ink">{budget.categoryName}</span>
                  <span className={`text-sm shrink-0 whitespace-nowrap ${STATUS_CLASSES[status]}`}>
                    {STATUS_LABEL[status]}
                  </span>
                </div>
                <ProgressBar
                  ratio={ratio}
                  tone={STATUS_TONE[status]}
                  label={'Presupuesto ' + budget.categoryName}
                  markerRatio={markerRatio}
                />
                <p className="text-body text-sm tabular-nums">
                  {formatMoney(budget.spentAmount, budget.currency)} de{' '}
                  {formatMoney(budget.limitAmount, budget.currency)}
                </p>
                <p className={`text-sm tabular-nums ${isAlarm ? 'text-expense' : 'text-body'}`}>
                  Proyección fin de mes: {formatMoney(budget.projectedEndOfMonth, budget.currency)}
                  {isAlarm && ' · va a excederse'}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
