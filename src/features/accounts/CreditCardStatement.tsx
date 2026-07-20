import { useState } from 'react';
import { Amount } from '../../components/ui/Amount';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { ChevronDownIcon } from '../../components/ui/icons';
import { StatementPaidToggle } from './StatementPaidToggle';
import { useStatement } from './useStatement';
import type { Account } from './api';

type CreditCardStatementProps = {
  account: Account;
  /** Madre (BANK/WALLET) si la tarjeta está vinculada — habilita "Pagar desde {madre}"
   *  (Sprint 22.4). Ausente en tarjetas CREDIT sueltas (solo marca cosmética). */
  parentAccount?: Account;
};

const MIN_OFFSET = -24;
const MAX_OFFSET = 0;

function formatDate(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function isPastDue(dueDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dueDate + 'T00:00:00') < today;
}

export function CreditCardStatement({ account, parentAccount }: CreditCardStatementProps) {
  const [offset, setOffset] = useState(0);
  // Sprint 22.2: el detalle completo arranca colapsado; se muestra siempre la deuda + el
  // período, y un botón (chevron) despliega/pliega el resto (reversible).
  const [expanded, setExpanded] = useState(false);
  const { data, isPending, isError } = useStatement(account.id, offset);

  return (
    <div className="flex flex-col gap-2 border-t border-line pt-3">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className="flex items-center justify-between gap-2 text-left"
      >
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          Resumen del ciclo
        </span>
        <span className="flex items-center gap-2">
          {data && (
            <span className="text-xs text-body">
              {formatDate(data.periodStart)}–{formatDate(data.periodEnd)}
              {offset < 0 && ` (hace ${Math.abs(offset)} ciclo${Math.abs(offset) === 1 ? '' : 's'})`}
            </span>
          )}
          <ChevronDownIcon
            className={`h-4 w-4 shrink-0 text-muted transition-transform duration-200 ${
              expanded ? '' : '-rotate-90'
            }`}
          />
        </span>
      </button>

      {isPending && <Skeleton variant="card" />}

      {isError && (
        <p role="alert" className="text-sm text-expense">
          No pudimos cargar el resumen de la tarjeta. Intentá de nuevo.
        </p>
      )}

      {/* Detalle expandible. La deuda ya se muestra arriba a la derecha del bloque, así que
          el "Saldo al cierre" vive sólo acá dentro. Sprint 22.3: dos columnas — stats a la
          izquierda, widget "¿Ya lo pagaste?" a la derecha. */}
      {expanded && data && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-1 text-sm">
              <p className="flex items-center gap-2 text-body">
                Consumos del ciclo:{' '}
                <Amount amount={data.totalSpent} currency={data.currency} tone="neutral" size="sm" />
              </p>
              <p className="flex items-center gap-2 text-body">
                Pagos: <Amount amount={data.payments} currency={data.currency} tone="neutral" size="sm" />
              </p>
              <p className="flex items-center gap-2 text-ink">
                Saldo al cierre:{' '}
                <Amount amount={data.closingBalance} currency={data.currency} tone="neutral" size="sm" />
              </p>
              {/* Sprint 22.3: si el ciclo está marcado pagado, el vencimiento ya no urge → no se pinta rojo. */}
              <p className={isPastDue(data.dueDate) && !data.paid ? 'text-expense' : 'text-body'}>
                {isPastDue(data.dueDate) ? 'Vencido el ' : 'Vence el '}
                {formatDate(data.dueDate)}
              </p>
            </div>

            <StatementPaidToggle card={account} data={data} parentAccount={parentAccount} />
          </div>

          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setOffset((o) => Math.max(MIN_OFFSET, o - 1))}
              disabled={offset <= MIN_OFFSET}
            >
              ← Anterior
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setOffset((o) => Math.min(MAX_OFFSET, o + 1))}
              disabled={offset >= MAX_OFFSET}
            >
              Siguiente →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
