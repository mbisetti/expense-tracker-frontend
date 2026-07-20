import { useNavigate } from 'react-router-dom';
import { Modal } from '../../components/ui/Modal';
import { Amount } from '../../components/ui/Amount';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { useTransactions } from '../transactions/useTransactions';
import { formatDate, useDateFormat } from '../../lib/dateFormat';
import { periodLabel } from '../../lib/months';
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

// Sprint 24 (D9): drill-down de las transacciones de UNA categoría en el mes. Solo lectura.
// NO toca TransactionsPage. Filtra la moneda client-side (GET /transactions no la filtra).
// S24.2 (D6): el bucket "Sin categoría" usa uncategorized=true; botón "Ver en Transacciones"
// deep-linkea a /transactions con los mismos filtros.
export function CategoryTransactionsModal({
  category,
  currency,
  year,
  month,
  onClose,
}: CategoryTransactionsModalProps) {
  const { pref } = useDateFormat();
  const navigate = useNavigate();
  const bounds = monthBounds(year, month);
  const isUncategorized = category.categoryId === null;

  const { data, isPending, isError } = useTransactions({
    categoryId: isUncategorized ? undefined : (category.categoryId ?? undefined),
    uncategorized: isUncategorized ? true : undefined,
    type: 'EXPENSE',
    dateFrom: bounds.from,
    dateTo: bounds.to,
    excludeTransferLegs: true,
    size: 100,
    sort: 'date',
    direction: 'DESC',
  });

  const rows = (data?.content ?? []).filter((t) => t.currency === currency);

  const openInTransactions = () => {
    const params = new URLSearchParams({
      type: 'EXPENSE',
      dateFrom: bounds.from,
      dateTo: bounds.to,
    });
    if (isUncategorized) params.set('uncategorized', 'true');
    else params.set('categoryId', category.categoryId!);
    navigate(`/transactions?${params.toString()}`);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`${category.name ?? 'Sin categoría'} · ${periodLabel(year, month)}`}
      footer={
        <Button type="button" variant="secondary" onClick={openInTransactions}>
          Ver en Transacciones
        </Button>
      }
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
