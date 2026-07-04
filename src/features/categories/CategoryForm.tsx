import { useState, type FormEvent } from 'react';
import { useCreateCategory, useUpdateCategory, type UpdateCategoryInput } from './useCategoryMutations';
import { categoryErrorMessage } from './errorMessages';
import type { Category, CategoryType } from './api';

type CategoryFormProps = {
  category?: Category;
  onClose: () => void;
};

export function CategoryForm({ category, onClose }: CategoryFormProps) {
  const isEdit = category !== undefined;

  const [name, setName] = useState(category?.name ?? '');
  const [type, setType] = useState<CategoryType>(category?.type ?? 'EXPENSE');
  // El input type=color necesita un hex válido aunque la categoría no tenga color;
  // comparar contra initialColor (no contra category.color) evita mandar el default
  // en PATCHes donde el usuario no tocó el picker
  const initialColor = category?.color ?? '#aa3bff';
  const [color, setColor] = useState(initialColor);

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

      if (Object.keys(changes).length === 0) {
        onClose();
        return;
      }
      updateMutation.mutate({ id: category.id, changes }, { onSuccess: onClose });
    } else {
      createMutation.mutate({ name, type, color }, { onSuccess: onClose });
    }
  };

  const isPending = mutation.isPending;

  return (
    <form onSubmit={handleSubmit} aria-label={isEdit ? 'Editar categoría' : 'Nueva categoría'}>
      <h2>{isEdit ? 'Editar categoría' : 'Nueva categoría'}</h2>

      <label htmlFor="cat-name">Nombre</label>
      <input
        id="cat-name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        maxLength={100}
        disabled={isPending}
      />

      <label htmlFor="cat-type">Tipo</label>
      <select
        id="cat-type"
        value={type}
        onChange={(e) => setType(e.target.value as CategoryType)}
        disabled={isPending}
      >
        <option value="EXPENSE">Gasto</option>
        <option value="INCOME">Ingreso</option>
        <option value="BOTH">Ambos</option>
      </select>

      <label htmlFor="cat-color">Color</label>
      <input
        id="cat-color"
        type="color"
        value={color}
        onChange={(e) => setColor(e.target.value)}
        disabled={isPending}
      />

      {mutation.isError && <p role="alert">{categoryErrorMessage(mutation.error)}</p>}

      <button type="submit" disabled={isPending}>
        {isPending ? 'Guardando...' : 'Guardar'}
      </button>
      <button type="button" onClick={onClose} disabled={isPending}>
        Cancelar
      </button>
    </form>
  );
}
