import { useEffect, useRef, useState } from 'react';
import { PencilIcon } from './icons';

type ActionsMenuProps = {
  /** Nombre del elemento, para el aria-label del disparador. */
  label: string;
  onEdit: () => void;
  onDelete: () => void;
};

// Acciones detrás de un lápiz (editar/borrar): "Borrar" queda fuera de alcance directo.
// Cierra al clickear afuera o con Esc. Reusado en Cuentas y Categorías (Sprint 21 tanda 3).
export function ActionsMenu({ label, onEdit, onDelete }: ActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Acciones de ${label}`}
        className="flex h-11 w-11 items-center justify-center rounded-sm text-body transition-colors duration-200 ease-out hover:bg-brand-bg hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <PencilIcon className="h-4 w-4" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 w-40 rounded-md border border-line bg-surface-elevated p-1 shadow-md"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            className="flex min-h-11 w-full items-center rounded-sm px-3 text-sm text-ink transition-colors duration-200 ease-out hover:bg-brand-bg"
          >
            Editar
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="flex min-h-11 w-full items-center rounded-sm px-3 text-sm text-ink transition-colors duration-200 ease-out hover:bg-expense/10 hover:text-expense"
          >
            Borrar
          </button>
        </div>
      )}
    </div>
  );
}
