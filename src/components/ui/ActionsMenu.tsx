import { PencilIcon, TrashIcon } from './icons';

type EditButtonProps = {
  /** Nombre del elemento, para el aria-label. */
  label: string;
  onClick: () => void;
};

// Lápiz que abre la edición directamente. El "Borrar" ya no vive acá: aparece DENTRO del
// form de edición (así queda fuera de alcance directo pero visible al editar). Sprint 21 t4.
export function EditButton({ label, onClick }: EditButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Editar ${label}`}
      className="flex h-11 w-11 items-center justify-center rounded-sm text-body transition-colors duration-200 ease-out hover:bg-brand-bg hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      <PencilIcon className="h-4 w-4" />
    </button>
  );
}

// Tacho para borrar en filas de listas de gestión (Personas, etc.): mismo formato que el lápiz
// — dos íconos parejos en vez de lápiz + botón con texto, que desbalanceaba la fila. El borrado
// destructivo sigue pasando por el ConfirmDialog de quien lo usa.
export function DeleteButton({ label, onClick }: EditButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Borrar ${label}`}
      className="flex h-11 w-11 items-center justify-center rounded-sm text-body transition-colors duration-200 ease-out hover:bg-expense/10 hover:text-expense focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      <TrashIcon className="h-4 w-4" />
    </button>
  );
}
