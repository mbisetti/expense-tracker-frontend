import { useEffect, useRef } from 'react';
import { AlertOctagonIcon, CheckCircleIcon, XIcon } from './icons';
import type { ToastVariant } from './toastContext';

type ToastProps = {
  variant: ToastVariant;
  message: string;
  onDismiss: () => void;
  duration?: number;
};

const AUTO_DISMISS_MS = 4000;

// El color NUNCA comunica solo (§1.6): ícono + texto siempre acompañan al tono.
// error reusa `expense` (mismo criterio que Button variant="danger"/campos con error);
// success reusa `income` (mismo criterio que Badge status="ok").
export function Toast({ variant, message, onDismiss, duration = AUTO_DISMISS_MS }: ToastProps) {
  const isError = variant === 'error';

  // Ref con el último onDismiss: evita reiniciar el timer si el padre re-renderiza con una
  // identidad de callback nueva (ToastProvider crea un `() => dismiss(id)` por toast). La
  // mutación del ref vive en un efecto (no en el render) para cumplir react-hooks/refs.
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    const timer = setTimeout(() => onDismissRef.current(), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  return (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? undefined : 'polite'}
      className={[
        'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-md border-l-4 bg-surface-elevated p-4 shadow-md',
        'transition-all duration-200 ease-out motion-reduce:transition-none',
        isError ? 'border-l-expense' : 'border-l-income',
      ].join(' ')}
    >
      {isError ? (
        <AlertOctagonIcon className="h-5 w-5 shrink-0 text-expense" />
      ) : (
        <CheckCircleIcon className="h-5 w-5 shrink-0 text-income" />
      )}
      <p className="flex-1 text-sm text-ink">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Cerrar notificación"
        className="-m-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-sm text-muted transition-colors duration-200 ease-out hover:bg-surface-sunken hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
      >
        <XIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
