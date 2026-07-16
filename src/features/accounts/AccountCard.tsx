import { useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { Amount } from '../../components/ui/Amount';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { useTransactions } from '../transactions/useTransactions';
import { BalanceSparkline } from './BalanceSparkline';
import type { Account, AccountType } from './api';

const TYPE_LABELS: Record<AccountType, string> = {
  CASH: 'Efectivo',
  DEBIT: 'Débito',
  CREDIT: 'Crédito',
};

// Traemos las últimas N para el sparkline; las 3 más recientes se muestran en la lista.
const RECENT_SIZE = 12;

function formatShortDate(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
  });
}

type AccountCardProps = {
  account: Account;
  onEdit: () => void;
  onDelete: () => void;
};

export function AccountCard({ account, onEdit, onDelete }: AccountCardProps) {
  const { data, isPending, isError } = useTransactions({
    accountId: account.id,
    size: RECENT_SIZE,
    sort: 'date',
    direction: 'DESC',
  });

  const txs = data?.content;
  const recent = (txs ?? []).slice(0, 3);

  // Serie de saldos reconstruida hacia atrás desde el balance ACTUAL: el saldo después de la
  // tx más nueva es el balance de la cuenta; retrocediendo, saldo_antes = saldo_después − Δ
  // (INCOME suma, EXPENSE resta). Se invierte para quedar en orden cronológico ascendente.
  const points = useMemo(() => {
    const list = txs ?? [];
    if (list.length === 0) return [];
    let running = account.balance;
    const desc: number[] = [];
    for (const tx of list) {
      desc.push(running);
      running -= tx.type === 'INCOME' ? tx.amount : -tx.amount;
    }
    desc.push(running); // saldo antes de la tx más vieja traída = punto de arranque
    return desc.reverse();
  }, [txs, account.balance]);

  return (
    <Card role="group" aria-label={account.name}>
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-ink">{account.name}</span>
              {account.isInformal && <Badge status="info" label="Informal" />}
            </div>
            <span className="text-sm text-muted">
              {TYPE_LABELS[account.type]} · {account.currency}
            </span>
          </div>
          <Amount amount={account.balance} currency={account.currency} tone="neutral" size="lg" />
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

        <div className="flex justify-end gap-2 border-t border-line pt-3">
          <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
            Editar
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onDelete}>
            Borrar
          </Button>
        </div>
      </div>
    </Card>
  );
}
