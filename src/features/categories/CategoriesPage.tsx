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
import { useToast } from '../../components/ui/toastContext';
import type { Category, CategoryType } from './api';

const TYPE_LABELS: Record<CategoryType, string> = {
  INCOME: 'Ingreso',
  EXPENSE: 'Gasto',
  BOTH: 'Ambos',
};

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
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th className="py-2 pr-2 font-medium">Nombre</th>
                <th className="py-2 pr-2 font-medium">Tipo</th>
                <th className="py-2 pr-2 font-medium">Color</th>
                <th className="py-2 pr-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => {
                // Defensa: las categorías del sistema (userId null) no se administran desde acá
                const isSystem = category.userId === null;
                return (
                  <tr key={category.id} className="border-b border-line">
                    <td className="py-2 pr-2 text-ink">{category.name}</td>
                    <td className="py-2 pr-2 text-body">{TYPE_LABELS[category.type]}</td>
                    <td className="py-2 pr-2">
                      {category.color && (
                        // Color elegido por el usuario: es DATO, no chrome (§ design-principles.md
                        // "excepción: el color elegible por el usuario para una categoría").
                        <span
                          aria-label={`Color ${category.color}`}
                          className="inline-block h-3.5 w-3.5 rounded-sm border border-line"
                          style={{ background: category.color }}
                        />
                      )}
                    </td>
                    <td className="py-2 pr-2">
                      {isSystem ? (
                        <em className="text-body">Sistema</em>
                      ) : (
                        <div className="flex gap-2">
                          <Button type="button" variant="ghost" size="sm" onClick={() => startEdit(category)}>
                            Editar
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmingDeleteId(category.id)}
                          >
                            Borrar
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
