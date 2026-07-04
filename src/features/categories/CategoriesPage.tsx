import { useState } from 'react';
import { useCategories } from './useCategories';
import { useDeleteCategory } from './useCategoryMutations';
import { categoryErrorMessage } from './errorMessages';
import { CategoryForm } from './CategoryForm';
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

  const { data: categories, isPending, isError } = useCategories();
  const deleteMutation = useDeleteCategory();

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const startEdit = (category: Category) => {
    setEditing(category);
    setFormOpen(true);
  };

  const confirmDelete = (id: string) => {
    deleteMutation.mutate(id, { onSuccess: () => setConfirmingDeleteId(null) });
  };

  return (
    <section>
      <h1>Categorías</h1>

      {!formOpen && (
        <button type="button" onClick={() => setFormOpen(true)}>
          Nueva categoría
        </button>
      )}

      {formOpen && (
        <CategoryForm
          key={editing?.id ?? 'new'}
          category={editing ?? undefined}
          onClose={closeForm}
        />
      )}

      {isPending && <p>Cargando categorías...</p>}

      {isError && <p role="alert">No pudimos cargar las categorías. Intentá de nuevo.</p>}

      {deleteMutation.isError && (
        <p role="alert">{categoryErrorMessage(deleteMutation.error)}</p>
      )}

      {categories && categories.length === 0 && <p>No hay categorías todavía.</p>}

      {categories && categories.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Color</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => {
              // Defensa: las categorías del sistema (userId null) no se administran desde acá
              const isSystem = category.userId === null;
              return (
                <tr key={category.id}>
                  <td>{category.name}</td>
                  <td>{TYPE_LABELS[category.type]}</td>
                  <td>
                    {category.color && (
                      <span
                        aria-label={`Color ${category.color}`}
                        style={{
                          display: 'inline-block',
                          width: 14,
                          height: 14,
                          borderRadius: 3,
                          background: category.color,
                        }}
                      />
                    )}
                  </td>
                  <td>
                    {isSystem ? (
                      <em>Sistema</em>
                    ) : confirmingDeleteId === category.id ? (
                      <>
                        ¿Borrar?{' '}
                        <button
                          type="button"
                          onClick={() => confirmDelete(category.id)}
                          disabled={deleteMutation.isPending}
                        >
                          Sí
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingDeleteId(null)}
                          disabled={deleteMutation.isPending}
                        >
                          No
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => startEdit(category)}>
                          Editar
                        </button>
                        <button type="button" onClick={() => setConfirmingDeleteId(category.id)}>
                          Borrar
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
