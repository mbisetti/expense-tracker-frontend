import { Amount } from '../../components/ui/Amount';
import { Button } from '../../components/ui/Button';
import type { PaymentMethod } from '../paymentMethods/api';
import type { TransactionListItem } from '../transactions/api';
import { CreditCardStatement } from './CreditCardStatement';
import type { Account } from './api';

type CardsSectionProps = {
  account: Account;
  allAccounts: Account[];
  paymentMethods: PaymentMethod[];
  /** Movimientos de la cuenta (ya traídos por el bloque): para el gasto del mes por tarjeta. */
  transactions: TransactionListItem[];
  /** Alta de tarjeta desde el bloque (D9: sólo se ofrece acá cuando hay 0 tarjetas). */
  onAddCard: () => void;
};

function currentYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Sprint 22.2: la "sección tarjetas" de una cuenta banco/billetera. Débito = PaymentMethod
// (un renglón, con el gasto de este mes a la derecha); crédito = cuenta CREDIT hija (nombre +
// deuda + resumen de ciclo de S22.1). La gestión (editar/borrar/agregar otra) con ≥1 tarjeta
// vive en el lápiz (AccountForm); acá sólo se muestra el listado y, con 0 tarjetas, el botón
// inline "Agregar tarjeta" (D9).
export function CardsSection({
  account,
  allAccounts,
  paymentMethods,
  transactions,
  onAddCard,
}: CardsSectionProps) {
  const cardPms = paymentMethods.filter(
    (pm) => pm.accountId === account.id && (pm.type === 'DEBIT' || pm.type === 'CREDIT'),
  );
  const creditChildren = allAccounts.filter(
    (a) => a.type === 'CREDIT' && a.linkedAccountId === account.id,
  );

  const hasCards = cardPms.length + creditChildren.length > 0;
  const ym = currentYearMonth();

  // Gasto de este mes con una tarjeta (PaymentMethod): EXPENSE del mes en curso con ese método.
  const spentThisMonth = (pmId: string): number =>
    transactions
      .filter((t) => t.type === 'EXPENSE' && t.paymentMethodId === pmId && t.date.slice(0, 7) === ym)
      .reduce((sum, t) => sum + t.amount, 0);

  if (!hasCards) {
    return (
      <div className="flex flex-col gap-2 border-t border-line pt-3">
        <span className="text-sm font-medium uppercase tracking-wide text-muted">Tarjetas</span>
        <Button type="button" variant="secondary" size="sm" onClick={onAddCard} className="self-start">
          Agregar tarjeta
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 border-t border-line pt-3">
      <span className="text-sm font-medium uppercase tracking-wide text-muted">Tarjetas</span>

      <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
        {cardPms.map((pm) => {
          const spent = spentThisMonth(pm.id);
          return (
            <li key={pm.id} className="flex items-center justify-between gap-3 py-2 first:pt-0">
              <span className="text-sm text-body">
                {pm.name} · {pm.type === 'DEBIT' ? 'Débito' : 'Crédito'}
              </span>
              <span className="flex flex-col items-end leading-tight">
                <Amount
                  amount={spent}
                  currency={account.currency}
                  tone={spent > 0 ? 'expense' : 'neutral'}
                  size="sm"
                />
                <span className="text-[10px] uppercase tracking-wide text-muted">gastado este mes</span>
              </span>
            </li>
          );
        })}

        {creditChildren.map((child) => (
          <li key={child.id} className="flex flex-col gap-1 py-2 first:pt-0">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-body">{child.name} · Crédito</span>
              <Amount amount={child.balance} currency={child.currency} tone="neutral" size="sm" />
            </div>
            {child.statementCloseDay != null && (
              <CreditCardStatement account={child} parentAccount={account} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
