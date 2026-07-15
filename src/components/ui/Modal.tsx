import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { XIcon } from './icons';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  /** Bloquea Esc, click en backdrop y el botón X (p.ej. mientras una request está en curso). */
  disableClose?: boolean;
};

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Modal accesible del design system (Bloque 3): focus trap manual (sin librería — no hay
// una en el proyecto), Esc cierra, click en backdrop cierra, foco vuelve al trigger al
// cerrar. `role="dialog"` + `aria-modal` + `aria-labelledby` (title, §4).
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  className,
  disableClose = false,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useId();

  // Refs con los últimos valores de onClose/disableClose: evitan reiniciar el effect de
  // foco/keydown cuando el padre re-renderiza con una identidad de callback nueva (p.ej.
  // ConfirmDialog pasa `onClose={onCancel}` sin memoizar) o cuando `disableClose` cambia
  // mientras el modal sigue abierto. Mismo patrón que `Toast.tsx` (mutación en un effect,
  // no en el render, para cumplir react-hooks/refs).
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const disableCloseRef = useRef(disableClose);
  useEffect(() => {
    disableCloseRef.current = disableClose;
  }, [disableClose]);

  // Captura el foco previo y enfoca el primer elemento SOLO en la transición closed→open;
  // restaura el foco previo al cerrar. Deps=[open] únicamente: un `onClose` con identidad
  // nueva en cada render del padre no debe re-disparar esto (si no, se roba el foco de
  // vuelta al trigger en medio de la interacción del usuario dentro del modal).
  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const dialogEl = dialogRef.current;
    const firstFocusable = dialogEl?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (firstFocusable ?? dialogEl)?.focus();

    return () => {
      previouslyFocused.current?.focus();
    };
  }, [open]);

  // Esc + focus trap (Tab/Shift+Tab). Deps=[open] únicamente — lee onClose/disableClose
  // desde los refs de arriba, así una identidad de callback nueva no desmonta/reinstala
  // el listener (que es justo el bug que roba el foco mid-typing).
  useEffect(() => {
    if (!open) return;
    const dialogEl = dialogRef.current;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        if (!disableCloseRef.current) onCloseRef.current();
        return;
      }
      if (event.key === 'Tab') {
        const nodes = dialogEl?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (!nodes || nodes.length === 0) return;
        const list = Array.from(nodes);
        const first = list[0];
        const last = list[list.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // Bloquea el scroll del fondo mientras el modal está abierto (§ contenido largo no debe
  // scrollear la página detrás del backdrop). Se restaura al cerrar/desmontar.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  function handleDismiss() {
    if (disableClose) return;
    onClose();
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        onClick={handleDismiss}
        className="absolute inset-0 bg-ink/50 transition-opacity duration-200 ease-out motion-reduce:transition-none"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={[
          'relative z-10 flex w-full max-w-md max-h-[85vh] flex-col gap-1 overflow-y-auto rounded-lg border border-line bg-surface-elevated p-6 shadow-lg',
          'transition-all duration-200 ease-out motion-reduce:transition-none',
          className ?? '',
        ]
          .join(' ')
          .trim()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-lg font-semibold text-ink">
            {title}
          </h2>
          <button
            type="button"
            onClick={handleDismiss}
            disabled={disableClose}
            aria-label="Cerrar"
            className="-m-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-sm text-muted transition-colors duration-200 ease-out hover:bg-surface-sunken hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="text-body">{children}</div>
        {footer && <div className="mt-4 flex justify-end gap-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
