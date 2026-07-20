import { Modal } from '../../components/ui/Modal';
import { Amount } from '../../components/ui/Amount';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { useTransactions } from '../transactions/useTransactions';
import { formatDate, useDateFormat } from '../../lib/dateFormat';
import type { CategoryExpense } from './api';

type CategoryTransactionsModalProps = {
  category: CategoryExpense;
  currency: string;
  year: number;
  /** 1-12 */
  month: number;
  onClose: () => void;
};

function monthBounds(year: number, month: number): { from: string; to: string } {
  const pad = (n: number) => String(n).padStart(2, '0');
  const lastDay = new Date(year, month, 0).getDate();
  return {
    from: `${year}-${pad(month)}-01`,
    to: `${year}-${pad(month)}-${pad(lastDay)}`,
  };
}

function periodLabel(year: number, month: number): string {
  const s = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(
    new Date(year, month - 1, 1),
  );
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Sprint 24 (D9): drill-down de las transacciones de UNA categoría en el mes. Solo lectura.
// NO toca TransactionsPage. Filtra la moneda client-side (GET /transactions no la filtra).
export function CategoryTransactionsModal({
  category,
  currency,
  year,
  month,
  onClose,
}: CategoryTransactionsModalProps) {
  const { pref } = useDateFormat();
  const bounds = monthBounds(year, month);
  const { data, isPending, isError } = useTransactions({
    categoryId: category.categoryId ?? undefined,
    type: 'EXPENSE',
    dateFrom: bounds.from,
    dateTo: bounds.to,
    excludeTransferLegs: true,
    size: 100,
    sort: 'date',
    direction: 'DESC',
  });

  const rows = (data?.content ?? []).filter((t) => t.currency === currency);

  return (
    <Modal
      open
      onClose={onClose}
      title={`${category.name ?? 'Sin categoría'} — ${periodLabel(year, month)}`}
    >
      {isPending && <Skeleton variant="list" rows={5} />}
      {isError && (
        <p role="alert" className="text-expense">
          No pudimos cargar las transacciones.
        </p>
      )}
      {!isPending && !isError && rows.length === 0 && (
        <EmptyState title="No hay gastos de esta categoría en el mes." />
      )}
      {rows.length > 0 && (
        <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
          {rows.map((tx) => (
            <li key={tx.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-ink">{tx.description ?? '—'}</span>
                <span className="tabular-nums text-xs text-muted">{formatDate(tx.date, pref)}</span>
              </div>
              <Amount amount={tx.amount} currency={tx.currency} tone="expense" size="sm" />
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
