import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/toastContext';
import { formatMoney } from '../../lib/money';
import { useExpectedIncome } from './useExpectedIncome';
import { useDeleteIncomeEntry } from './useIncomeMutations';
import { ConfirmIncomeDialog } from './ConfirmIncomeDialog';
import { expectedStateBadge } from './expectedFormat';
import { incomeErrorMessage } from './errorMessages';
import type { ExpectedIncomeSource, IncomeFrequency } from './api';

const FREQUENCY_LABEL: Record<IncomeFrequency, string> = {
  MONTHLY: 'cada mes',
  BIWEEKLY: 'cada quincena',
  WEEKLY: 'cada semana',
  SEMIANNUAL: 'cada seis meses',
  ANNUAL: 'una vez al año',
};

type Props = {
  /**
   * S36 (FR-7/D4): deep-link del centro de notificaciones (`/income?confirm=<sourceId>`). Con
   * una sola fuente pendiente la notificación deja de ser un cartel y abre directo su confirm.
   */
  autoConfirmSourceId?: string | null;
};

export function ExpectedIncomeCard({ autoConfirmSourceId }: Props = {}) {
  const toast = useToast();
  const { data, isPending, isError } = useExpectedIncome();
  const deleteMutation = useDeleteIncomeEntry();
  const [confirming, setConfirming] = useState<ExpectedIncomeSource | null>(null);
  const [undoing, setUndoing] = useState<ExpectedIncomeSource | null>(null);
  const [autoConfirmDone, setAutoConfirmDone] = useState(false);
  const dayOfMonth = new Date().getDate();

  // Se consume UNA vez, cuando llega el feed (mismo patrón que el `?edit=` de Transacciones).
  // Si la fuente ya no está pendiente, no se abre nada: el usuario la cargó mientras tanto.
  if (autoConfirmSourceId && !autoConfirmDone && data) {
    setAutoConfirmDone(true);
    const target = data.sources.find((s) => s.sourceId === autoConfirmSourceId);
    if (target && target.receivedCount < target.expectedCount) {
      setConfirming(target);
    }
  }

  // Sin fuentes recurrentes: no hay nada que proyectar, no metemos ruido de card vacía.
  if (data && data.sources.length === 0) {
    return null;
  }

  const confirmUndo = () => {
    if (!undoing?.lastEntryId) return;
    deleteMutation.mutate(undoing.lastEntryId, {
      onSuccess: () => toast.success('Ingreso borrado.'),
      onError: (error) => toast.error(incomeErrorMessage(error)),
      onSettled: () => setUndoing(null),
    });
  };

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

          {/* Fila en DOS líneas: arriba quién y cada cuánto, abajo la plata, el estado y la
              acción. En una sola línea, nombre + frecuencia + monto + chip + botón se apretaban
              hasta romperse en pantalla chica. */}
          <ul className="list-none p-0 m-0 flex flex-col gap-2 divide-y divide-line">
            {data.sources.map((source) => {
              // S36 (FR-5): la expectativa es una CANTIDAD de cobros, no un sí/no. Una quincenal
              // con uno cargado sigue pendiente por el segundo.
              const pending = source.expectedCount - source.receivedCount;
              const isComplete = source.expectedCount > 0 && pending <= 0;
              const notDue = source.expectedCount === 0;   // anual/semestral fuera de su mes
              const badge = expectedStateBadge(source, dayOfMonth);

              return (
                <li key={source.sourceId} className="pt-2 first:pt-0 flex flex-col gap-1">
                  <span className="text-ink">
                    {source.name}{' '}
                    <span className="text-body text-sm">{FREQUENCY_LABEL[source.frequency]}</span>
                  </span>

                  <span className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="tabular-nums">
                        {formatMoney(source.expectedAmount, source.currency)}
                      </span>
                      <Badge status={badge.status} label={badge.label} />
                    </span>

                    {isComplete && source.lastEntryId && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Deshacer ${source.name}`}
                        onClick={() => setUndoing(source)}
                      >
                        Deshacer
                      </Button>
                    )}
                    {!isComplete && !notDue && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Confirmar ${source.name}`}
                        onClick={() => setConfirming(source)}
                      >
                        Ya lo cobré
                      </Button>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {confirming && (
        <ConfirmIncomeDialog source={confirming} onClose={() => setConfirming(null)} />
      )}

      {/* D2: destickear borra la entry y su transacción — plata ya asentada, a diferencia del
          desmarcar de la tarjeta, que es cosmético. Por eso pide confirmación. */}
      <ConfirmDialog
        open={undoing !== null}
        danger
        title="Deshacer el ingreso"
        message="Se borra el ingreso cargado y su movimiento. El saldo de la cuenta vuelve atrás."
        confirmLabel="Deshacer"
        loading={deleteMutation.isPending}
        onConfirm={confirmUndo}
        onCancel={() => setUndoing(null)}
      />
    </Card>
  );
}
