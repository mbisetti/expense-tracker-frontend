import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/Card';
import { formatMoney } from '../../lib/money';
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

  return (
    <Card>
      <div className="flex items-baseline justify-between gap-2">
        <h3>{account.name}</h3>
        {data && (
          <span className="text-body text-sm">
            Ciclo {formatDate(data.periodStart)}–{formatDate(data.periodEnd)}
            {offset < 0 && ` (hace ${Math.abs(offset)} ciclo${Math.abs(offset) === 1 ? '' : 's'})`}
          </span>
        )}
      </div>

      {isPending && <p>Cargando resumen...</p>}

      {isError && <p role="alert">No pudimos cargar el resumen de la tarjeta. Intentá de nuevo.</p>}

      {data && (
        <div className="flex flex-col gap-1">
          <p className="text-body">Consumos del ciclo: {formatMoney(data.totalSpent, data.currency)}</p>
          <p className="text-body">Pagos: {formatMoney(data.payments, data.currency)}</p>
          <p className="text-ink">Saldo al cierre: {formatMoney(data.closingBalance, data.currency)}</p>
          <p className={isPastDue(data.dueDate) ? 'text-expense' : 'text-body'}>
            {isPastDue(data.dueDate) ? 'Vencido el ' : 'Vence el '}
            {formatDate(data.dueDate)}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOffset((o) => Math.max(MIN_OFFSET, o - 1))}
          disabled={offset <= MIN_OFFSET}
        >
          ← Anterior
        </button>
        <button
          type="button"
          onClick={() => setOffset((o) => Math.min(MAX_OFFSET, o + 1))}
          disabled={offset >= MAX_OFFSET}
        >
          Siguiente →
        </button>
      </div>

      <Link to={`/transfers?to=${account.id}`} className="text-brand text-sm">
        Registrar pago
      </Link>
    </Card>
  );
}
