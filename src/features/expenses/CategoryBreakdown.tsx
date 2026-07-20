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

// S24.2 (B): categorías con share redondeado < 5% del subset visible colapsan en la lista
// (detrás de "Ver todos") y forman "Otras" en el donut. Reemplaza el top-8 arbitrario.
const SHARE_THRESHOLD = 5;

type CategoryFilter = 'all' | 'essential' | 'non-essential';

const FILTERS: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'essential', label: 'Esenciales' },
  { value: 'non-essential', label: 'No esenciales' },
];

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
  // S24.2 (B): triple toggle + "Ver todos". Se resetean al remontar (key por mes/moneda en la página).
  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [showAll, setShowAll] = useState(false);

  // El toggle solo se ofrece para categorías del usuario (excluye soft-borradas → 404, y de
  // sistema → 403, que pueden aparecer en el breakdown por gastos históricos).
  const toggleableIds = useMemo(
    () => new Set((userCategories ?? []).map((c) => c.id)),
    [userCategories],
  );

  // Subset por el triple toggle. "Sin categoría" (isEssential=false) cuenta como no esencial,
  // consistente con el backend.
  const subset = useMemo(
    () =>
      data.byCategory.filter((c) => {
        if (filter === 'essential') return c.isEssential;
        if (filter === 'non-essential') return !c.isEssential;
        return true;
      }),
    [data.byCategory, filter],
  );

  const subsetTotal = subset.reduce((sum, c) => sum + c.amount, 0);
  const shareOf = (amount: number) =>
    subsetTotal > 0 ? Math.round((amount / subsetTotal) * 100) : 0;

  // Regla 5% sobre el subset visible: visibles ≥5%, el resto colapsa. Si colapsaría UNA sola,
  // se muestra directo (un "Ver todos (1)" es ridículo).
  const { visible, collapsed } = useMemo(() => {
    const vis: CategoryExpense[] = [];
    const col: CategoryExpense[] = [];
    for (const c of subset) {
      (shareOf(c.amount) >= SHARE_THRESHOLD ? vis : col).push(c);
    }
    if (col.length === 1) vis.push(col.pop()!);
    return { visible: vis, collapsed: col };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subset, subsetTotal]);

  // S24.2 fix: color estable por categoría — el color propio, o un hue de la paleta categórica
  // por su posición en el orden COMPLETO del mes (no en el subset filtrado → el triple toggle
  // no repinta). Compartido por el donut y el swatch de la lista. Antes: todo caía en muted →
  // muchos gajos "negros" indistinguibles.
  const colorMap = useMemo(() => {
    const m = new Map<string, string>();
    data.byCategory.forEach((c, i) => {
      m.set(c.categoryId ?? 'uncategorized', c.color ?? `var(--cat-${(i % 8) + 1})`);
    });
    return m;
  }, [data.byCategory]);
  const colorFor = (c: CategoryExpense) => colorMap.get(c.categoryId ?? 'uncategorized') ?? 'var(--muted)';

  // Donut: visibles + "Otras" (= exactamente el conjunto colapsado). El donut NO se expande.
  const slices = useMemo<DonutSlice[]>(() => {
    const s: DonutSlice[] = visible.map((c) => ({
      name: catLabel(c),
      value: c.amount,
      color: colorMap.get(c.categoryId ?? 'uncategorized') ?? 'var(--muted)',
    }));
    if (collapsed.length > 0) {
      s.push({
        name: 'Otras',
        value: collapsed.reduce((sum, c) => sum + c.amount, 0),
        color: 'var(--muted)',
      });
    }
    return s;
  }, [visible, collapsed, colorMap]);

  const listRows = showAll ? [...visible, ...collapsed] : visible;

  const changeFilter = (next: CategoryFilter) => {
    setFilter(next);
    setShowAll(false);
  };

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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2>Por categoría</h2>
        {/* Triple toggle (B.1): filtra donut + lista; los % se recalculan sobre el subset. */}
        <div role="group" aria-label="Filtrar categorías" className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={filter === f.value}
              onClick={() => changeFilter(f.value)}
              className={[
                'rounded-full border px-3 py-1 text-sm transition-colors',
                filter === f.value
                  ? 'border-brand bg-brand/10 text-ink'
                  : 'border-line text-body hover:border-brand',
              ].join(' ')}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {subset.length === 0 ? (
        <p className="text-body">
          {filter === 'essential'
            ? 'Todavía no marcaste categorías esenciales.'
            : 'No hay gastos no esenciales este mes.'}
        </p>
      ) : (
        <>
          <Suspense fallback={<Skeleton variant="chart" />}>
            <CategoryDonut slices={slices} currency={data.currency} />
          </Suspense>

          <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
            {listRows.map((category) => {
              const key = category.categoryId ?? 'uncategorized';
              const share = shareOf(category.amount);
              const delta = deltaVsPrev(category.amount, category.prevMonthAmount);
              const canToggle =
                category.categoryId !== null && toggleableIds.has(category.categoryId);
              return (
                <li key={key} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="inline-block h-3 w-3 shrink-0 rounded-sm border border-line"
                      style={{ background: colorFor(category) }}
                    />
                    {/* S24.2 (D6): "Sin categoría" también es clickeable (drill vía uncategorized). */}
                    <button
                      type="button"
                      onClick={() => onDrill(category)}
                      className="truncate text-left text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    >
                      {catLabel(category)}
                    </button>
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
                    {/* S24.2 fix: las sin cambio muestran "—" (muted) en vez de un hueco. */}
                    <span
                      className={[
                        'tabular-nums text-xs',
                        delta.direction === 'up' || delta.direction === 'new'
                          ? 'text-expense'
                          : delta.direction === 'down'
                            ? 'text-income'
                            : 'text-muted',
                      ].join(' ')}
                    >
                      {delta.direction === 'up' ? '↑ ' : delta.direction === 'down' ? '↓ ' : ''}
                      {delta.text}
                    </span>
                    <Amount amount={category.amount} currency={data.currency} tone="neutral" size="sm" />
                  </div>
                </li>
              );
            })}
          </ul>

          {collapsed.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="self-start text-sm text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              {showAll ? 'Ver menos' : `Ver todos (${collapsed.length})`}
            </button>
          )}
        </>
      )}
    </section>
  );
}
