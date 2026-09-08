import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { ReorderList } from '../../components/ui/ReorderList';
import { useToast } from '../../components/ui/toastContext';
import { useReorderCategories, useUpdateCategory } from './useCategoryMutations';
import { categoryErrorMessage } from './errorMessages';
import { assignDistinctColors, fixedTypesFor } from './categoryColors';
import type { Category, CategoryType } from './api';

type OrganizeCategoriesModalProps = {
  open: boolean;
  /** Las categorías del usuario, en el orden que manda el server. */
  categories: Category[];
  onClose: () => void;
};

const SECTIONS: { type: CategoryType; label: string }[] = [
  { type: 'EXPENSE', label: 'Gasto' },
  { type: 'INCOME', label: 'Ingreso' },
  { type: 'BOTH', label: 'Ambos' },
];

type Orders = Record<CategoryType, Category[]>;

function splitByType(categories: Category[]): Orders {
  return {
    EXPENSE: categories.filter((c) => c.type === 'EXPENSE'),
    INCOME: categories.filter((c) => c.type === 'INCOME'),
    BOTH: categories.filter((c) => c.type === 'BOTH'),
  };
}

const idsOf = (list: Category[]) => list.map((c) => c.id).join(',');

// "Água" y "agua" juntas, y las mayúsculas no mandan.
const collator = new Intl.Collator('es', { sensitivity: 'base' });

// S48: el estado (tres listas + colores) es LOCAL y se monta al abrir: Guardar persiste, Cancelar
// descarta. Es una divergencia a propósito con ReorderAccountsModal (que guarda en cada drop):
// la vista previa de colores necesita un estado que no se persiste hasta confirmarlo, y mezclar
// "el drag guarda solo" con "los colores no" en el mismo modal confunde. El Modal lo renderiza
// el estado (patrón de HoldingForm) porque el footer y disableClose leen de él.
export function OrganizeCategoriesModal({ open, categories, onClose }: OrganizeCategoriesModalProps) {
  if (!open) return null;
  return <Organizer categories={categories} onClose={onClose} />;
}

function Organizer({ categories, onClose }: { categories: Category[]; onClose: () => void }) {
  const toast = useToast();
  const reorder = useReorderCategories();
  const update = useUpdateCategory();
  const [tab, setTab] = useState<CategoryType>('EXPENSE');
  const [orders, setOrders] = useState<Orders>(() => splitByType(categories));
  // id → hex local. Sólo las reasignadas; el resto se lee de la categoría.
  const [colors, setColors] = useState<Record<string, string>>({});
  // Secciones ya reasignadas en esta apertura: ahí el botón pasa a decir "Mezclar de nuevo".
  const [mixed, setMixed] = useState<Set<CategoryType>>(() => new Set());
  const [saving, setSaving] = useState(false);

  const colorOf = (c: Category) => colors[c.id] ?? c.color;

  // El orden persistido es global, pero sólo importa dentro del tipo: se compara sección por
  // sección contra lo que manda el server (`categories` es la query viva: si cambió mientras el
  // modal estaba abierto, el diff es contra lo actual, no contra lo de apertura).
  const orderChanged = SECTIONS.some(
    ({ type }) => idsOf(orders[type]) !== idsOf(categories.filter((c) => c.type === type)),
  );
  const colorChanges = () => {
    const byId = new Map(categories.map((c) => [c.id, c]));
    return Object.entries(colors).filter(([id, hex]) => {
      const current = byId.get(id);
      return current !== undefined && current.color !== hex;
    });
  };
  const dirty = orderChanged || colorChanges().length > 0;

  function sortAZ() {
    setOrders((prev) => ({
      ...prev,
      [tab]: [...prev[tab]].sort((a, b) => collator.compare(a.name, b.name)),
    }));
  }

  function reassignColors() {
    const section = orders[tab];
    if (section.length === 0) return;
    // Fijos: lo que se grafica junto con esta sección, con los colores LOCALES. Si ya
    // reasignaste otra sección en esta apertura, se esquivan los nuevos, no los viejos.
    const fixed = fixedTypesFor(tab).flatMap((t) => orders[t].map(colorOf));
    const assigned = assignDistinctColors(fixed, section.length, Math.random);
    setColors((prev) => {
      const next = { ...prev };
      section.forEach((c, i) => {
        next[c.id] = assigned[i];
      });
      return next;
    });
    setMixed((prev) => new Set(prev).add(tab));
  }

  async function save() {
    setSaving(true);
    const jobs: Promise<unknown>[] = [];
    if (orderChanged) {
      jobs.push(reorder.mutateAsync([...orders.EXPENSE, ...orders.INCOME, ...orders.BOTH].map((c) => c.id)));
    }
    for (const [id, color] of colorChanges()) {
      jobs.push(update.mutateAsync({ id, changes: { color } }));
    }
    const results = await Promise.allSettled(jobs);
    setSaving(false);
    const failed = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
    if (failed) {
      // El modal se queda abierto con el estado local intacto: un segundo Guardar manda sólo
      // lo que todavía difiere.
      toast.error(categoryErrorMessage(failed.reason));
      return;
    }
    toast.success('Categorías organizadas.');
    onClose();
  }

  const section = orders[tab];

  return (
    <Modal
      open
      onClose={onClose}
      title="Organizar categorías"
      disableClose={saving}
      footer={
        <div className="flex w-full flex-wrap items-center justify-center gap-3">
          <Button type="button" onClick={save} loading={saving} disabled={!dirty}>
            Guardar
          </Button>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div role="tablist" aria-label="Tipo" className="flex gap-2">
          {SECTIONS.map(({ type, label }) => {
            const isSelected = type === tab;
            return (
              <button
                key={type}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setTab(type)}
                className={
                  isSelected
                    ? 'rounded-full border border-brand bg-brand-bg px-3 py-1 text-sm text-brand'
                    : 'rounded-full border border-line bg-transparent px-3 py-1 text-sm text-body'
                }
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={sortAZ}
            disabled={saving || section.length < 2}
          >
            Ordenar A-Z
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={reassignColors}
            disabled={saving || section.length === 0}
          >
            {mixed.has(tab) ? 'Mezclar de nuevo' : 'Reasignar colores'}
          </Button>
        </div>

        {section.length === 0 ? (
          <EmptyState title="No hay categorías de este tipo." />
        ) : (
          // key por sección: al cambiar de pestaña se descarta cualquier drag a medias.
          <ReorderList
            key={tab}
            items={section}
            getId={(c) => c.id}
            getLabel={(c) => c.name}
            onMove={(next) => setOrders((prev) => ({ ...prev, [tab]: next }))}
            renderRow={(c) => {
              const color = colorOf(c);
              return (
                <span className="flex min-w-0 items-center gap-2">
                  {/* El hueco del color se reserva siempre, como en la página. */}
                  {color ? (
                    <span
                      aria-label={`Color ${color}`}
                      className="inline-block h-3.5 w-3.5 shrink-0 rounded-sm border border-line"
                      style={{ background: color }}
                    />
                  ) : (
                    <span aria-hidden="true" className="inline-block h-3.5 w-3.5 shrink-0" />
                  )}
                  <span className="truncate text-sm text-body">{c.name}</span>
                  {c.isEssential && <Badge status="info" label="Esencial" />}
                </span>
              );
            }}
          />
        )}
      </div>
    </Modal>
  );
}
