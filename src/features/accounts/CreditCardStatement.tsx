import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Amount } from '../../components/ui/Amount';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { ChevronDownIcon } from '../../components/ui/icons';
import { currencyNoun } from '../../lib/money';
import { useMe } from '../auth/useMe';
import { StatementPaidToggle } from './StatementPaidToggle';
import { SubBalanceChip } from './SubBalanceChip';
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
  // La moneda favorita del usuario decide qué renglones se pueden hoverear para ver el
  // equivalente estimado (FR-9): el que ya está en su moneda no tiene nada que convertir.
  const { data: me } = useMe();

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

      {/* Detalle expandible. Sprint 27: UN BLOQUE POR MONEDA. Una tarjeta argentina acumula dos
          deudas separadas en el mismo resumen (verificado contra un resumen real: dos hileras
          con su propio total), cierran y vencen juntas pero se pagan por separado. El
          vencimiento, que es del ciclo, se muestra una sola vez abajo. */}
      {expanded && data && (
        <div className="flex flex-col gap-3">
          {data.lines.length === 0 && (
            <p className="text-sm text-muted">No hubo movimientos en este ciclo.</p>
          )}

          {data.lines.map((line) => (
            <div
              key={line.currency}
              className="flex flex-col gap-2 rounded-md border border-line p-3 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="flex flex-col gap-1 text-sm">
                {/* D9: "Compras en pesos", NO "Deuda en pesos". El resumen del banco muestra un
                    "total a pagar en pesos" que incluye los dólares convertidos y los impuestos;
                    estos números son las compras limpias y separadas, distintos a propósito. */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted">
                    Compras en {currencyNoun(line.currency)}
                  </span>
                  {/* FR-9: los renglones en una moneda distinta a la favorita se pueden hoverear
                      para ver el equivalente estimado. Mismo chip de S22.1, cero concepto nuevo.
                      Sin favorita conocida no hay a qué convertir, así que tampoco va el chip. */}
                  {!!me?.defaultCurrency && line.currency !== me.defaultCurrency && (
                    <SubBalanceChip
                      currency={line.currency}
                      balance={line.closingBalance}
                      favoriteCurrency={me?.defaultCurrency}
                    />
                  )}
                </div>
                <p className="flex items-center gap-2 text-body">
                  Consumos del ciclo:{' '}
                  <Amount
                    amount={line.totalSpent}
                    currency={line.currency}
                    tone="neutral"
                    size="sm"
                  />
                </p>
                <p className="flex items-center gap-2 text-body">
                  Pagos:{' '}
                  <Amount amount={line.payments} currency={line.currency} tone="neutral" size="sm" />
                </p>
                <p className="flex items-center gap-2 text-ink">
                  Saldo al cierre:{' '}
                  <Amount
                    amount={line.closingBalance}
                    currency={line.currency}
                    tone="neutral"
                    size="sm"
                  />
                </p>
                {/* D8/FR-6: pagar de más no se bloquea, se avisa — y el aviso lleva a los
                    movimientos para ver dónde se pifió. El excedente NO baja la deuda de la
                    otra moneda: son deudas separadas. */}
                {line.closingBalance > 0 && (
                  <Link
                    to={`/transactions?accountId=${account.id}`}
                    className="text-sm text-expense underline underline-offset-2"
                  >
                    Pagaste de más: quedó saldo a favor en {currencyNoun(line.currency)}. Ver
                    movimientos
                  </Link>
                )}
              </div>

              <StatementPaidToggle
                card={account}
                data={data}
                line={line}
                parentAccount={parentAccount}
              />
            </div>
          ))}

          {/* Del ciclo, compartido por los renglones: se muestra una sola vez. Sprint 22.3: si
              está todo pagado, el vencimiento ya no urge → no se pinta rojo. */}
          <p
            className={
              isPastDue(data.dueDate) && !data.lines.every((l) => l.paid)
                ? 'text-sm text-expense'
                : 'text-sm text-body'
            }
          >
            {isPastDue(data.dueDate) ? 'Vencido el ' : 'Vence el '}
            {formatDate(data.dueDate)}
          </p>

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
