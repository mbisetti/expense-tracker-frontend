import { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Amount } from '../../components/ui/Amount';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { PencilIcon } from '../../components/ui/icons';
import { useTransactions } from '../transactions/useTransactions';
import { BalanceSparkline } from './BalanceSparkline';
import type { Account, AccountType } from './api';

const TYPE_LABELS: Record<AccountType, string> = {
  CASH: 'Efectivo',
  DEBIT: 'Débito',
  CREDIT: 'Crédito',
};

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

type AccountCardProps = {
  account: Account;
  onEdit: () => void;
  onDelete: () => void;
};

export function AccountCard({ account, onEdit, onDelete }: AccountCardProps) {
  const { data, isPending, isError } = useTransactions({
    accountId: account.id,
    dateFrom: isoDaysShift(CHART_MONTHS),
    size: FETCH_SIZE,
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
    const desc: { date: string; balance: number }[] = [];
    for (const tx of list) {
      desc.push({ date: tx.date, balance: running });
      running -= tx.type === 'INCOME' ? tx.amount : -tx.amount;
    }
    const asc = desc.reverse();
    // Extiende plano hasta hoy si el último movimiento es anterior.
    const today = todayIso();
    if (asc[asc.length - 1].date < today) asc.push({ date: today, balance: account.balance });
    return asc;
  }, [txs, account.balance]);

  // Menú de acciones (lápiz): editar/borrar quedan detrás de un click para que "Borrar" no
  // esté tan a mano (reporte de Marko). Cierra al clickear afuera o con Esc.
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

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

        <div ref={menuRef} className="relative flex justify-end border-t border-line pt-3">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={`Acciones de ${account.name}`}
            className="flex h-11 w-11 items-center justify-center rounded-sm text-body transition-colors duration-200 ease-out hover:bg-brand-bg hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute bottom-full right-0 z-20 mb-1 w-40 rounded-md border border-line bg-surface-elevated p-1 shadow-md"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit();
                }}
                className="flex min-h-11 w-full items-center rounded-sm px-3 text-sm text-ink transition-colors duration-200 ease-out hover:bg-brand-bg"
              >
                Editar
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete();
                }}
                className="flex min-h-11 w-full items-center rounded-sm px-3 text-sm text-ink transition-colors duration-200 ease-out hover:bg-expense/10 hover:text-expense"
              >
                Borrar
              </button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
