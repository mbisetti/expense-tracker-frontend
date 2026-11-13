import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../components/ui/Modal';
import { Amount } from '../../components/ui/Amount';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { useTransactions } from '../transactions/useTransactions';
import { formatDate, useDateFormat } from '../../lib/dateFormat';
import { periodLabel } from '../../lib/months';
import type { CategoryExpense, SubcategoryExpense } from './api';

type CategoryTransactionsModalProps = {
  category: CategoryExpense;
  currency: string;
  year: number;
  /** 1-12 */
  month: number;
  onClose: () => void;
};

// S51: el renglón "Sin subcategoría" no tiene id; el filtro lo nombra con esto.
const NO_SUBCATEGORY = '__none__';

function monthBounds(year: number, month: number): { from: string; to: string } {
  const pad = (n: number) => String(n).padStart(2, '0');
  const lastDay = new Date(year, month, 0).getDate();
  return {
    from: `${year}-${pad(month)}-01`,
    to: `${year}-${pad(month)}-${pad(lastDay)}`,
  };
}

const subKey = (sub: SubcategoryExpense) => sub.subcategoryId ?? NO_SUBCATEGORY;
const subLabel = (sub: SubcategoryExpense) => sub.name ?? 'Sin subcategoría';

// Sprint 24 (D9): drill-down de las transacciones de UNA categoría en el mes. Solo lectura.
// NO toca TransactionsPage. Filtra la moneda client-side (GET /transactions no la filtra).
// S24.2 (D6): el bucket "Sin categoría" usa uncategorized=true; botón "Ver en Transacciones"
// deep-linkea a /transactions con los mismos filtros.
// S51 (D9): la lupa. Si la categoría tiene movimientos con subcategoría en el mes, arriba va el
// desglose; tocar un renglón filtra la lista de abajo (en el cliente) y tocarlo de nuevo lo saca.
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
  const subcategories = category.subcategories ?? [];
  const [subFilter, setSubFilter] = useState<string | null>(null);

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

  const subNames = new Map(
    subcategories.filter((s) => s.subcategoryId).map((s) => [s.subcategoryId as string, s.name]),
  );
  const rows = (data?.content ?? [])
    .filter((t) => t.currency === currency)
    .filter((t) => {
      if (subFilter === null) return true;
      if (subFilter === NO_SUBCATEGORY) return !t.subcategoryId;
      return t.subcategoryId === subFilter;
    });

  const shareOf = (amount: number) =>
    category.amount > 0 ? Math.round((amount / category.amount) * 100) : 0;

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
      {subcategories.length > 0 && (
        <section aria-label="Por subcategoría" className="mb-4 flex flex-col gap-1">
          <h3 className="text-sm font-semibold text-ink">Por subcategoría</h3>
          <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
            {subcategories.map((sub) => {
              const key = subKey(sub);
              const active = subFilter === key;
              return (
                <li key={key}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSubFilter(active ? null : key)}
                    className={[
                      'flex w-full items-center justify-between gap-3 px-1 py-2 text-left text-sm',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                      active ? 'bg-brand/10' : 'hover:bg-surface-sunken',
                    ].join(' ')}
                  >
                    <span className="truncate text-ink">{subLabel(sub)}</span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="tabular-nums text-muted">{`${shareOf(sub.amount)}%`}</span>
                      <Amount amount={sub.amount} currency={currency} tone="neutral" size="sm" />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

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
          {rows.map((tx) => {
            const sub = tx.subcategoryId ? subNames.get(tx.subcategoryId) : null;
            return (
              <li key={tx.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-ink">{tx.description ?? '—'}</span>
                  <span className="tabular-nums text-xs text-muted">
                    {sub ? `${formatDate(tx.date, pref)} · ${sub}` : formatDate(tx.date, pref)}
                  </span>
                </div>
                <Amount amount={tx.amount} currency={tx.currency} tone="expense" size="sm" />
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
