import { useState, type FormEvent } from 'react';
import { useCreateCategory, useUpdateCategory, type UpdateCategoryInput } from './useCategoryMutations';
import { categoryErrorMessage } from './errorMessages';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Switch } from '../../components/ui/Switch';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/toastContext';
import { FIELD_LABEL_CLASS, FIELD_WRAPPER_CLASS } from '../../components/ui/fieldStyles';
import type { Category, CategoryType } from './api';

type CategoryFormProps = {
  category?: Category;
  onClose: () => void;
  /** En edición: dispara el borrado (con confirmación en la página). */
  onDelete?: () => void;
};

export function CategoryForm({ category, onClose, onDelete }: CategoryFormProps) {
  const isEdit = category !== undefined;
  const toast = useToast();

  const [name, setName] = useState(category?.name ?? '');
  const [type, setType] = useState<CategoryType>(category?.type ?? 'EXPENSE');
  // El input type=color necesita un hex válido aunque la categoría no tenga color;
  // comparar contra initialColor (no contra category.color) evita mandar el default
  // en PATCHes donde el usuario no tocó el picker
  const initialColor = category?.color ?? '#aa3bff';
  const [color, setColor] = useState(initialColor);
  // Sprint 24 (D3/D7): esencialidad. En INCOME el flag no se muestra (conceptualmente es de gasto).
  const [isEssential, setIsEssential] = useState(category?.isEssential ?? false);

  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const mutation = isEdit ? updateMutation : createMutation;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isEdit) {
      const changes: UpdateCategoryInput = {};
      if (name !== category.name) changes.name = name;
      if (type !== category.type) changes.type = type;
      if (color !== initialColor) changes.color = color;
      if (isEssential !== category.isEssential) changes.isEssential = isEssential;

      if (Object.keys(changes).length === 0) {
        onClose();
        return;
      }
      updateMutation.mutate(
        { id: category.id, changes },
        {
          onSuccess: () => {
            toast.success('Categoría actualizada.');
            onClose();
          },
          onError: (error) => toast.error(categoryErrorMessage(error)),
        },
      );
    } else {
      createMutation.mutate(
        { name, type, color, isEssential: type === 'INCOME' ? undefined : isEssential },
        {
          onSuccess: () => {
            toast.success('Categoría creada.');
            onClose();
          },
          onError: (error) => toast.error(categoryErrorMessage(error)),
        },
      );
    }
  };

  const isPending = mutation.isPending;

  return (
    <form
      onSubmit={handleSubmit}
      aria-label={isEdit ? 'Editar categoría' : 'Nueva categoría'}
      className="flex flex-col gap-3"
    >
      <Input
        label="Nombre"
        id="cat-name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        maxLength={100}
        disabled={isPending}
      />

      <Select
        label="Tipo"
        id="cat-type"
        value={type}
        onChange={(e) => setType(e.target.value as CategoryType)}
        disabled={isPending}
      >
        <option value="EXPENSE">Gasto</option>
        <option value="INCOME">Ingreso</option>
        <option value="BOTH">Ambos</option>
      </Select>

      {/* Color: dato del usuario, no chrome (excepción explícita de design-principles.md
          §1.1) — el picker crudo <input type=color> queda tal cual, sin tokenizar. */}
      <div className={FIELD_WRAPPER_CLASS}>
        <label htmlFor="cat-color" className={FIELD_LABEL_CLASS}>
          Color
        </label>
        <input
          id="cat-color"
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          disabled={isPending}
          className="h-11 w-16 cursor-pointer rounded-sm border border-line bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {/* Sprint 24 (D7): esencialidad — oculta con tipo INCOME (el flag es conceptualmente de gasto). */}
      {type !== 'INCOME' && (
        <Switch
          label="Esencial"
          checked={isEssential}
          onChange={setIsEssential}
          disabled={isPending}
          helper="Los gastos esenciales no cuentan como recortables"
        />
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" loading={isPending}>
          Guardar
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
          disabled={isPending}
        >
          Cancelar
        </Button>
        {isEdit && onDelete && (
          <Button
            type="button"
            variant="ghost"
            onClick={onDelete}
            disabled={isPending}
            className="ml-auto border-expense/40 text-expense hover:bg-expense/10 hover:text-expense"
          >
            Borrar
          </Button>
        )}
      </div>
    </form>
  );
}
