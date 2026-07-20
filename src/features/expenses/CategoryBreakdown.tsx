import { lazy, Suspense, useMemo, useState } from 'react';
import { Amount } from '../../components/ui/Amount';
import { Switch } from '../../components/ui/Switch';
import { Skeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/toastContext';
import { useCategories } from '../categories/useCategories';
import { useUpdateCategory } from '../categories/useCategoryMutations';
import { categoryErrorMessage } from '../categories/errorMessages';
import { deltaVsPrev } from './format';
import type { CategoryExpense, CurrencyExpenses } from './api';
import type { DonutSlice } from './CategoryDonut';

// Recharts lazy: no engordar el bundle inicial (patrón MonthlyChart / D9).
const CategoryDonut = lazy(() =>
  import('./CategoryDonut').then((m) => ({ default: m.CategoryDonut })),
);

const DONUT_TOP = 8;

type CategoryBreakdownProps = {
  data: CurrencyExpenses;
  onDrill: (category: CategoryExpense) => void;
};

function catLabel(category: CategoryExpense): string {
  return category.name ?? 'Sin categoría';
}

export function CategoryBreakdown({ data, onDrill }: CategoryBreakdownProps) {
  const toast = useToast();
  const { data: userCategories } = useCategories();
  const updateCategory = useUpdateCategory();
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // El toggle solo se ofrece para categorías del usuario (excluye soft-borradas → 404, y de
  // sistema → 403, que pueden aparecer en el breakdown por gastos históricos).
  const toggleableIds = useMemo(
    () => new Set((userCategories ?? []).map((c) => c.id)),
    [userCategories],
  );

  // Donut: top 8 por monto + "Otras" agrupadas SOLO en el chart. fill = color de la categoría
  // con fallback al borde; "Sin categoría"/"Otras" en tono muted.
  const slices = useMemo<DonutSlice[]>(() => {
    const top = data.byCategory.slice(0, DONUT_TOP).map((c) => ({
      name: catLabel(c),
      value: c.amount,
      color: c.color ?? 'var(--border)',
    }));
    const rest = data.byCategory.slice(DONUT_TOP);
    if (rest.length > 0) {
      const otras = rest.reduce((sum, c) => sum + c.amount, 0);
      top.push({ name: 'Otras', value: otras, color: 'var(--muted)' });
    }
    return top;
  }, [data.byCategory]);

  const handleToggle = (category: CategoryExpense, next: boolean) => {
    if (category.categoryId === null) return;
    setTogglingId(category.categoryId);
    updateCategory.mutate(
      { id: category.categoryId, changes: { isEssential: next } },
      {
        // Sin toast de éxito (D7): el feedback es visual. Toast solo en error.
        onError: (error) => toast.error(categoryErrorMessage(error)),
        onSettled: () => setTogglingId(null),
      },
    );
  };

  if (data.byCategory.length === 0) {
    return (
      <section className="rounded-xl border border-line bg-surface p-4">
        <h2>Por categoría</h2>
        <p className="text-body">No hay gastos con categoría este mes.</p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4">
      <h2>Por categoría</h2>

      <Suspense fallback={<Skeleton variant="chart" />}>
        <CategoryDonut slices={slices} currency={data.currency} />
      </Suspense>

      <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
        {data.byCategory.map((category) => {
          const key = category.categoryId ?? 'uncategorized';
          const share = data.total > 0 ? Math.round((category.amount / data.total) * 100) : 0;
          const delta = deltaVsPrev(category.amount, category.prevMonthAmount);
          const canToggle = category.categoryId !== null && toggleableIds.has(category.categoryId);
          const canDrill = category.categoryId !== null;
          return (
            <li key={key} className="flex items-center justify-between gap-3 py-2 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden="true"
                  className="inline-block h-3 w-3 shrink-0 rounded-sm border border-line"
                  style={{ background: category.color ?? 'var(--muted)' }}
                />
                {canDrill ? (
                  <button
                    type="button"
                    onClick={() => onDrill(category)}
                    className="truncate text-left text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    {catLabel(category)}
                  </button>
                ) : (
                  <span className="truncate text-body">{catLabel(category)}</span>
                )}
                {canToggle && (
                  <Switch
                    ariaLabel={`Marcar ${catLabel(category)} como esencial`}
                    checked={category.isEssential}
                    onChange={(next) => handleToggle(category, next)}
                    disabled={togglingId === category.categoryId}
                  />
                )}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="tabular-nums text-muted">{share}%</span>
                {delta.direction !== 'flat' && (
                  <span
                    className={[
                      'tabular-nums text-xs',
                      delta.direction === 'up' || delta.direction === 'new'
                        ? 'text-expense'
                        : 'text-income',
                    ].join(' ')}
                  >
                    {delta.direction === 'up' ? '↑' : delta.direction === 'down' ? '↓' : ''}{' '}
                    {delta.text}
                  </span>
                )}
                <Amount amount={category.amount} currency={data.currency} tone="neutral" size="sm" />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
