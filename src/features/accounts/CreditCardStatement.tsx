import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Amount } from '../../components/ui/Amount';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { useStatement } from './useStatement';
import type { Account } from './api';

type CreditCardStatementProps = {
  account: Account;
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

export function CreditCardStatement({ account }: CreditCardStatementProps) {
  const [offset, setOffset] = useState(0);
  const { data, isPending, isError } = useStatement(account.id, offset);

  // Sprint 22.1: se renderiza DENTRO de la card de la cuenta (debajo de los movimientos),
  // no como bloque aparte → sin <Card> propio ni el nombre (la card ya lo muestra).
  return (
    <div className="flex flex-col gap-2 border-t border-line pt-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          Resumen del ciclo
        </span>
        {data && (
          <span className="text-xs text-body">
            {formatDate(data.periodStart)}–{formatDate(data.periodEnd)}
            {offset < 0 && ` (hace ${Math.abs(offset)} ciclo${Math.abs(offset) === 1 ? '' : 's'})`}
          </span>
        )}
      </div>

      {isPending && <Skeleton variant="card" />}

      {isError && (
        <p role="alert" className="text-sm text-expense">
          No pudimos cargar el resumen de la tarjeta. Intentá de nuevo.
        </p>
      )}

      {data && (
        <div className="flex flex-col gap-1 text-sm">
          <p className="flex items-center gap-2 text-body">
            Consumos del ciclo: <Amount amount={data.totalSpent} currency={data.currency} tone="neutral" size="sm" />
          </p>
          <p className="flex items-center gap-2 text-body">
            Pagos: <Amount amount={data.payments} currency={data.currency} tone="neutral" size="sm" />
          </p>
          <p className="flex items-center gap-2 text-ink">
            Saldo al cierre:{' '}
            <Amount amount={data.closingBalance} currency={data.currency} tone="neutral" size="sm" />
          </p>
          <p className={isPastDue(data.dueDate) ? 'text-expense' : 'text-body'}>
            {isPastDue(data.dueDate) ? 'Vencido el ' : 'Vence el '}
            {formatDate(data.dueDate)}
          </p>
        </div>
      )}

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

      <Link
        to={`/transfers?to=${account.id}`}
        className="text-sm font-medium text-brand transition-colors duration-200 ease-out hover:text-brand-hover"
      >
        Registrar pago
      </Link>
    </div>
  );
}
