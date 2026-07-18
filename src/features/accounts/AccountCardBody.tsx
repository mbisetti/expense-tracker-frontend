import { useMemo } from 'react';
import { Amount } from '../../components/ui/Amount';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { EditButton } from '../../components/ui/ActionsMenu';
import { useTransactions } from '../transactions/useTransactions';
import { useMe } from '../auth/useMe';
import type { PaymentMethod } from '../paymentMethods/api';
import { BalanceSparkline } from './BalanceSparkline';
import { SubBalanceChip } from './SubBalanceChip';
import { CreditCardStatement } from './CreditCardStatement';
import { CardsSection } from './CardsSection';
import { TYPE_LABELS } from './typeLabels';
import type { Account } from './api';

// Ventana del gráfico de saldo: ~3 meses. El backend clampea size a 100 (suficiente para una
// cuenta personal); las 3 tx más recientes se muestran en la lista de movimientos.
const CHART_MONTHS = 3;
const FETCH_SIZE = 100;

function isoDaysShift(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function todayIso(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function formatShortDate(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
  });
}

type AccountCardBodyProps = {
  account: Account;
  /** Todas las cuentas del usuario: la sección tarjetas busca las CREDIT hijas (D2). */
  allAccounts: Account[];
  /** Todos los PMs del usuario (un solo fetch a nivel página): se filtran por cuenta y tipo. */
  paymentMethods: PaymentMethod[];
  onEdit: () => void;
  /** Alta de tarjeta desde el bloque (sólo BANK/WALLET con 0 tarjetas, D9). */
  onAddCard: () => void;
};

// Sprint 22.2: cuerpo reutilizable de la card de cuenta (header + saldo + chips, sparkline,
// últimos 3 mov, y — para BANK/WALLET — la sección tarjetas al pie). Una card de grupo
// (institución con 2+ cuentas) compone varios de estos con divisores.
export function AccountCardBody({
  account,
  allAccounts,
  paymentMethods,
  onEdit,
  onAddCard,
}: AccountCardBodyProps) {
  const { data, isPending, isError } = useTransactions({
    accountId: account.id,
    dateFrom: isoDaysShift(CHART_MONTHS),
    size: FETCH_SIZE,
    sort: 'date',
    direction: 'DESC',
  });

  const { data: me } = useMe();

  const txs = data?.content;
  const recent = (txs ?? []).slice(0, 3);

  const subBalances = (account.balances ?? []).filter(
    (b) => b.currency !== account.currency && b.balance !== 0,
  );

  const isBankLike = account.type === 'BANK' || account.type === 'WALLET';

  const points = useMemo(() => {
    const list = (txs ?? []).filter((tx) => tx.currency === account.currency);
    if (list.length === 0) return [];
    let running = account.balance;
    const desc: { date: string; balance: number }[] = [];
    for (const tx of list) {
      desc.push({ date: tx.date, balance: running });
      running -= tx.type === 'INCOME' ? tx.amount : -tx.amount;
    }
    const asc = desc.reverse();
    const today = todayIso();
    if (asc[asc.length - 1].date < today) asc.push({ date: today, balance: account.balance });
    return asc;
  }, [txs, account.balance, account.currency]);

  return (
    <div role="group" aria-label={account.name} className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-ink">{account.name}</span>
            {account.isInformal && <Badge status="info" label="Informal" />}
          </div>
          <span className="text-sm text-muted">
            {TYPE_LABELS[account.type]}
            {account.institution ? ` · ${account.institution}` : ''} · {account.currency}
          </span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Amount amount={account.balance} currency={account.currency} tone="neutral" size="lg" />
          {subBalances.length > 0 && (
            <div className="flex flex-wrap justify-end gap-1.5">
              {subBalances.map((b) => (
                <SubBalanceChip
                  key={b.currency}
                  currency={b.currency}
                  balance={b.balance}
                  favoriteCurrency={me?.defaultCurrency}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {points.length >= 2 && <BalanceSparkline points={points} />}

      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          Últimos movimientos
        </span>
        {isPending ? (
          <Skeleton variant="list" rows={3} />
        ) : isError ? (
          <p className="text-sm text-expense">No pudimos cargar los movimientos.</p>
        ) : recent.length === 0 ? (
          <p className="text-sm text-muted">Sin movimientos todavía.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
            {recent.map((tx) => (
              <li key={tx.id} className="flex items-center justify-between gap-3 py-1.5">
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm text-ink">
                    {tx.description || (tx.type === 'INCOME' ? 'Ingreso' : 'Gasto')}
                  </span>
                  <span className="text-xs tabular-nums text-muted">{formatShortDate(tx.date)}</span>
                </span>
                <Amount
                  amount={tx.amount}
                  currency={tx.currency}
                  tone={tx.type === 'INCOME' ? 'income' : 'expense'}
                  size="sm"
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Sprint 22.2: sección tarjetas (débito = PM, crédito = cuenta hija) al pie de las
          cuentas banco/billetera. */}
      {isBankLike && (
        <CardsSection
          account={account}
          allAccounts={allAccounts}
          paymentMethods={paymentMethods}
          transactions={txs ?? []}
          onAddCard={onAddCard}
        />
      )}

      {/* Sprint 22.1: el resumen del ciclo de una CREDIT suelta (sin vínculo) vive dentro de
          su propia card. Las CREDIT vinculadas se renderizan dentro de la sección tarjetas
          de su madre, no acá (nunca llegan como top-level). */}
      {account.type === 'CREDIT' && account.statementCloseDay != null && (
        <CreditCardStatement account={account} />
      )}

      <div className="flex justify-end border-t border-line pt-3">
        <EditButton label={account.name} onClick={onEdit} />
      </div>
    </div>
  );
}
