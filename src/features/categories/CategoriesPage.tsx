import { useState } from 'react';
import { useCategories } from './useCategories';
import { useDeleteCategory } from './useCategoryMutations';
import { categoryErrorMessage } from './errorMessages';
import { CategoryForm } from './CategoryForm';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { ActionsMenu } from '../../components/ui/ActionsMenu';
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
      <h1>Categorías</h1>

      <Button type="button" onClick={openCreate} className="self-start">
        Nueva categoría
      </Button>

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
                <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
                  {group.map((category) => {
                    // Defensa: las categorías del sistema (userId null) no se administran desde acá
                    const isSystem = category.userId === null;
                    return (
                      <li
                        key={category.id}
                        className="flex items-center justify-between gap-3 py-2 text-sm"
                      >
                        <span className="flex items-center gap-2">
                          {category.color && (
                            // Color elegido por el usuario: es DATO, no chrome (§ design-principles.md
                            // "excepción: el color elegible por el usuario para una categoría").
                            <span
                              aria-label={`Color ${category.color}`}
                              className="inline-block h-3.5 w-3.5 shrink-0 rounded-sm border border-line"
                              style={{ background: category.color }}
                            />
                          )}
                          <span className="text-ink">{category.name}</span>
                        </span>
                        {isSystem ? (
                          <em className="text-body">Sistema</em>
                        ) : (
                          <ActionsMenu
                            label={category.name}
                            onEdit={() => startEdit(category)}
                            onDelete={() => setConfirmingDeleteId(category.id)}
                          />
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
        <CategoryForm key={editing?.id ?? 'new'} category={editing ?? undefined} onClose={closeForm} />
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
