import { useId, useState, type ReactNode } from 'react';

type TooltipProps = {
  /** Texto flotante de ayuda. */
  text: string;
  /** El trigger (lo que se hoverea/tapea). */
  children: ReactNode;
  /** aria-label del trigger (por si el contenido no es texto accesible por sí solo). */
  label?: string;
};

// Tooltip accesible (Sprint 22.4). Generaliza el hover/focus por CSS de SubBalanceChip y le
// suma tap para touch (hover no existe en mobile, la app es mobile-first) y Escape. Visible
// cuando: hover (group-hover), foco del trigger (group-focus-within) o tap (estado `open`).
export function Tooltip({ text, children, label }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-describedby={id}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setOpen(false);
            e.currentTarget.blur(); // cierra también el group-focus-within
          }
        }}
        className="inline-flex cursor-help items-center"
      >
        {children}
      </button>
      <span
        id={id}
        role="tooltip"
        className={`pointer-events-none absolute left-1/2 top-full z-20 mt-1 w-56 -translate-x-1/2 rounded-md border border-line bg-surface-elevated px-2 py-1.5 text-xs text-body shadow-md group-hover:block group-focus-within:block ${
          open ? 'block' : 'hidden'
        }`}
      >
        {text}
      </span>
    </span>
  );
}
