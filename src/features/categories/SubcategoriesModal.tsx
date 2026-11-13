import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Modal } from '../../components/ui/Modal';
import { ReorderList } from '../../components/ui/ReorderList';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import { DeleteButton, EditButton } from '../../components/ui/ActionsMenu';
import { useToast } from '../../components/ui/toastContext';
import { useCategories } from './useCategories';
import {
  useCreateSubcategory,
  useDeleteSubcategory,
  useRenameSubcategory,
  useReorderSubcategories,
} from './useSubcategoryMutations';
import { categoryErrorMessage } from './errorMessages';
import type { Subcategory } from './api';

// S51 (D4): el mismo tope que el server. Existe por el prompt del bot.
export const MAX_SUBCATEGORIES = 20;

type SubcategoriesModalProps = {
  open: boolean;
  /** La categoría cuyas subcategorías se administran. */
  categoryId: string | null;
  onClose: () => void;
};

// S51 (D8): las subcategorías de UNA categoría. No vive adentro de CategoryForm porque ese es un
// <form> con su propio Guardar, y acá cada operación es inmediata: un request por acción, y la
// lista se lee de la query de categorías (no de una copia por props) para reflejar cada una.
// No hay Guardar: el único botón del pie es "Listo".
export function SubcategoriesModal({ open, categoryId, onClose }: SubcategoriesModalProps) {
  const { data: categories } = useCategories();
  const category = categories?.find((c) => c.id === categoryId);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={category ? `Subcategorías de ${category.name}` : 'Subcategorías'}
      footer={
        <Button type="button" onClick={onClose}>
          Listo
        </Button>
      }
    >
      {open && categoryId && (
        <Inner
          categoryId={categoryId}
          categoryName={category?.name ?? ''}
          subcategories={category?.subcategories ?? []}
          missing={!category}
        />
      )}
    </Modal>
  );
}

type InnerProps = {
  categoryId: string;
  categoryName: string;
  subcategories: Subcategory[];
  missing: boolean;
};

function Inner({ categoryId, categoryName, subcategories, missing }: InnerProps) {
  const toast = useToast();
  const create = useCreateSubcategory(categoryId);
  const rename = useRenameSubcategory(categoryId);
  const remove = useDeleteSubcategory(categoryId);
  const reorder = useReorderSubcategories(categoryId);

  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  // Orden optimista mientras viaja el PUT: se suelta cuando la query ya trae el orden nuevo.
  const [pendingOrder, setPendingOrder] = useState<Subcategory[] | null>(null);
  // Los PUT se serializan, como en cuentas: drops rápidos no viajan en paralelo.
  const chain = useRef<Promise<unknown>>(Promise.resolve());

  if (missing) {
    return <EmptyState title="Esta categoría ya no existe." />;
  }

  const items = pendingOrder ?? subcategories;
  const full = subcategories.length >= MAX_SUBCATEGORIES;

  const fail = (error: unknown) => toast.error(categoryErrorMessage(error));

  const handleCreate = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name || full) return;
    create.mutate(name, {
      // El input conserva el foco (no se desmonta): se cargan varias seguidas con Enter.
      onSuccess: () => setNewName(''),
      onError: fail,
    });
  };

  const startEdit = (sub: Subcategory) => {
    setConfirmingId(null);
    setEditingId(sub.id);
    setDraftName(sub.name);
  };

  const commitEdit = (sub: Subcategory) => {
    // Primero se sale del modo edición: Enter y el blur posterior no mandan dos PATCH.
    setEditingId(null);
    const name = draftName.trim();
    if (!name || name === sub.name) return;
    rename.mutate({ id: sub.id, name }, { onError: fail });
  };

  const handleEditKey = (e: KeyboardEvent<HTMLInputElement>, sub: Subcategory) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit(sub);
    } else if (e.key === 'Escape') {
      // Esc cancela la edición y NO cierra el modal.
      e.preventDefault();
      e.stopPropagation();
      setEditingId(null);
    }
  };

  const confirmDelete = (sub: Subcategory) => {
    remove.mutate(sub.id, {
      onSuccess: () => {
        setConfirmingId(null);
        toast.success('Subcategoría borrada.');
      },
      onError: fail,
    });
  };

  const handleMove = (next: Subcategory[]) => {
    setPendingOrder(next);
    chain.current = chain.current
      .then(() => reorder.mutateAsync(next.map((s) => s.id)))
      .catch(fail)
      .finally(() => setPendingOrder(null));
  };

  return (
    <div className="flex flex-col gap-4">
      {items.length === 0 ? (
        <p className="text-sm text-body">
          Todavía no tiene subcategorías. Sirven para ver en qué se va la plata adentro de la
          categoría.
        </p>
      ) : (
        <ReorderList
          items={items}
          getId={(sub) => sub.id}
          getLabel={(sub) => sub.name}
          onMove={handleMove}
          renderRow={(sub) =>
            confirmingId === sub.id ? (
              <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-ink">
                  {`¿Borrar ${sub.name}? Sus movimientos quedan en ${categoryName}, sin subcategoría.`}
                </span>
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => confirmDelete(sub)}
                    loading={remove.isPending}
                    className="border-expense/40 text-expense hover:bg-expense/10 hover:text-expense"
                  >
                    Borrar
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setConfirmingId(null)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                {editingId === sub.id ? (
                  <input
                    aria-label={`Nombre de ${sub.name}`}
                    value={draftName}
                    maxLength={100}
                    autoFocus
                    onChange={(e) => setDraftName(e.target.value)}
                    onKeyDown={(e) => handleEditKey(e, sub)}
                    onBlur={() => commitEdit(sub)}
                    className="min-w-0 flex-1 rounded-sm border border-line bg-surface-sunken px-2 py-1 text-sm text-ink"
                  />
                ) : (
                  <span className="truncate text-sm text-body">{sub.name}</span>
                )}
                <div className="flex shrink-0 items-center gap-1">
                  <EditButton label={sub.name} onClick={() => startEdit(sub)} />
                  <DeleteButton
                    label={sub.name}
                    onClick={() => {
                      setEditingId(null);
                      setConfirmingId(sub.id);
                    }}
                  />
                </div>
              </div>
            )
          }
        />
      )}

      <form onSubmit={handleCreate} className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <Input
            label="Nueva subcategoría"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={100}
            disabled={full}
            helper={full ? `Llegaste al máximo de ${MAX_SUBCATEGORIES}.` : undefined}
          />
        </div>
        <Button
          type="submit"
          variant="secondary"
          loading={create.isPending}
          disabled={full || newName.trim() === ''}
        >
          Agregar
        </Button>
      </form>
    </div>
  );
}
