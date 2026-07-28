import { useId } from 'react';
import { InfoIcon } from '../../components/ui/icons';

type SharedInfoButtonProps = {
  /** Texto que aparece al hover/foco. Tiene que decir de QUÉ gasto se trata. */
  text: string;
  label: string;
  onClick: () => void;
};

// La ⓘ celeste del feed. No usa `components/ui/Tooltip` porque ese envuelve al trigger en su
// PROPIO <button> (su click togglea el globito): acá el click tiene que abrir el reparto, y
// anidar botones es HTML inválido. Comparte las clases del tooltip, así se ve igual.
//
// En touch no hay hover y el globito no aparece — no hace falta: tocar abre el detalle, que
// explica todo con más espacio del que entra en un tooltip.
//
// Celeste = token `transfer`, el que el design system ya usa para lo informativo
// (Badge status="info" es `bg-transfer/10 text-transfer` con este mismo ícono).
export function SharedInfoButton({ text, label, onClick }: SharedInfoButtonProps) {
  const id = useId();

  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-describedby={id}
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-transfer/50 text-transfer transition-colors duration-200 ease-out hover:border-transfer hover:bg-transfer/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-transfer"
      >
        <InfoIcon className="h-3.5 w-3.5" />
      </button>
      <span
        id={id}
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 hidden w-56 -translate-x-1/2 rounded-md border border-line bg-surface-elevated px-2 py-1.5 text-xs text-body shadow-md group-hover:block group-focus-within:block"
      >
        {text}
      </span>
    </span>
  );
}
