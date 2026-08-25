import { useState } from 'react';
import { useCategories } from './useCategories';
import { useDeleteCategory } from './useCategoryMutations';
import { categoryErrorMessage } from './errorMessages';
import { CategoryForm } from './CategoryForm';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EditButton } from '../../components/ui/ActionsMenu';
import { useToast } from '../../components/ui/toastContext';
import type { Category, CategoryType } from './api';

// Las categorías se muestran agrupadas por tipo, cada grupo con su subtítulo (Sprint 21 tanda 3).
const TYPE_GROUPS: { type: CategoryType; label: string }[] = [
  { type: 'EXPENSE', label: 'Gasto' },
  { type: 'INCOME', label: 'Ingreso' },
  { type: 'BOTH', label: 'Ambos' },
];

export function CategoriesPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const toast = useToast();
  const { data: categories, isPending, isError } = useCategories();
  const deleteMutation = useDeleteCategory();

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const startEdit = (category: Category) => {
    setEditing(category);
    setFormOpen(true);
  };

  const confirmDelete = () => {
    if (!confirmingDeleteId) return;
    deleteMutation.mutate(confirmingDeleteId, {
      onSuccess: () => toast.success('Categoría borrada.'),
      onError: (error) => toast.error(categoryErrorMessage(error)),
      onSettled: () => setConfirmingDeleteId(null),
    });
  };

  return (
    <section className="flex flex-col gap-4 text-left">
      <PageHeader
        title="Categorías"
        actions={
          <Button type="button" onClick={openCreate}>
            Nueva categoría
          </Button>
        }
      />

      {isPending && <Skeleton variant="list" rows={4} />}

      {isError && (
        <p role="alert" className="text-expense">
          No pudimos cargar las categorías. Intentá de nuevo.
        </p>
      )}

      {categories && categories.length === 0 && <EmptyState title="No hay categorías todavía." />}

      {categories && categories.length > 0 && (
        <div className="flex flex-col gap-6">
          {TYPE_GROUPS.map(({ type, label }) => {
            const group = categories.filter((c) => c.type === type);
            if (group.length === 0) return null;
            return (
              <section key={type} className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold text-ink">{label}</h2>
                {/* Dos columnas desde sm: una lista de nombres cortos a 1024px de ancho dejaba
                    el medio vacío y la página al doble de largo. El borde va por ítem (no
                    divide-y, que no funciona en grid). */}
                <ul className="m-0 grid list-none grid-cols-1 gap-x-8 p-0 sm:grid-cols-2">
                  {group.map((category) => {
                    // Defensa: las categorías del sistema (userId null) no se administran desde acá
                    const isSystem = category.userId === null;
                    return (
                      <li
                        key={category.id}
                        className="flex min-h-11 items-center justify-between gap-3 border-b border-line py-1 text-sm"
                      >
                        <span className="flex items-center gap-2">
                          {/* El hueco del color se reserva SIEMPRE: sin esto, los nombres de las
                              categorías sin color quedaban corridos respecto del resto. */}
                          {category.color ? (
                            // Color elegido por el usuario: es DATO, no chrome (§ design-principles.md
                            // "excepción: el color elegible por el usuario para una categoría").
                            <span
                              aria-label={`Color ${category.color}`}
                              className="inline-block h-3.5 w-3.5 shrink-0 rounded-sm border border-line"
                              style={{ background: category.color }}
                            />
                          ) : (
                            <span aria-hidden="true" className="inline-block h-3.5 w-3.5 shrink-0" />
                          )}
                          <span className="text-ink">{category.name}</span>
                          {/* Sprint 24: marca visual de esencialidad (info, barato). */}
                          {category.isEssential && <Badge status="info" label="Esencial" />}
                        </span>
                        {isSystem ? (
                          <em className="text-body">Sistema</em>
                        ) : (
                          <EditButton label={category.name} onClick={() => startEdit(category)} />
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editing ? 'Editar categoría' : 'Nueva categoría'}
      >
        <CategoryForm
          key={editing?.id ?? 'new'}
          category={editing ?? undefined}
          onClose={closeForm}
          onDelete={
            editing
              ? () => {
                  const id = editing.id;
                  closeForm();
                  setConfirmingDeleteId(id);
                }
              : undefined
          }
        />
      </Modal>

      <ConfirmDialog
        open={confirmingDeleteId !== null}
        danger
        title="Borrar categoría"
        message="Esta acción no se puede deshacer."
        confirmLabel="Borrar"
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmingDeleteId(null)}
      />
    </section>
  );
}
