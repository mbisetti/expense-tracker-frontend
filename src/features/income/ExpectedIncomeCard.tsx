import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatMoney } from '../../lib/money';
import { useExpectedIncome } from './useExpectedIncome';
import type { IncomeFrequency } from './api';

const FREQUENCY_LABEL: Record<IncomeFrequency, string> = {
  MONTHLY: 'cada mes',
  BIWEEKLY: 'cada quincena',
  WEEKLY: 'cada semana',
};

export function ExpectedIncomeCard() {
  const { data, isPending, isError } = useExpectedIncome();
  const dayOfMonth = new Date().getDate();

  // Sin fuentes recurrentes: no hay nada que proyectar, no metemos ruido de card vacía.
  if (data && data.sources.length === 0) {
    return null;
  }

  return (
    <Card>
      <h2>Ingresos esperados del mes</h2>

      {isPending && <Skeleton variant="list" rows={2} />}

      {isError && (
        <p role="alert" className="text-expense">
          No pudimos cargar los ingresos esperados. Intentá de nuevo.
        </p>
      )}

      {data && data.sources.length > 0 && (
        <>
          <ul className="list-none p-0 m-0 flex flex-col gap-1 mb-3">
            {data.byCurrency.map((currencyTotal) => (
              <li key={currencyTotal.currency} className="text-body text-sm tabular-nums">
                Esperado: {formatMoney(currencyTotal.expectedTotal, currencyTotal.currency)} ·{' '}
                Pendiente:{' '}
                <span className={currencyTotal.pendingTotal > 0 ? 'text-warning' : undefined}>
                  {formatMoney(currencyTotal.pendingTotal, currencyTotal.currency)}
                </span>
              </li>
            ))}
          </ul>

          <ul className="list-none p-0 m-0 flex flex-col gap-2 divide-y divide-line">
            {data.sources.map((source) => {
              const isDue = !source.received && source.billingDay <= dayOfMonth;

              return (
                <li key={source.sourceId} className="pt-2 first:pt-0 flex justify-between items-baseline gap-2">
                  <span>
                    <span className={isDue ? 'text-warning' : 'text-ink'}>{source.name}</span>{' '}
                    <span className="text-body text-sm">{FREQUENCY_LABEL[source.frequency]}</span>
                  </span>
                  <span className="flex items-center gap-2 text-sm shrink-0 whitespace-nowrap">
                    <span className="tabular-nums">
                      {formatMoney(source.expectedAmount, source.currency)}
                    </span>
                    {source.received ? (
                      <span className="text-income opacity-80">cargado</span>
                    ) : isDue ? (
                      <span className="text-warning">no cargado</span>
                    ) : (
                      <span className="text-body">pendiente</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Card>
  );
}
