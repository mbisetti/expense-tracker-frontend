import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Toast } from './Toast';
import { ToastContext, type ToastContextValue, type ToastVariant } from './toastContext';

type ToastItem = {
  id: string;
  variant: ToastVariant;
  message: string;
};

// Contador simple en vez de crypto.randomUUID: determinístico y sin dependencias externas
// (más fácil de testear con fake timers, sin mocks extra).
let nextId = 0;

// Provider self-contained (S18): no se monta en el root todavía — S19 lo monta una vez en
// AppLayout/main y todas las pantallas usan useToast() para el feedback de mutación (§5).
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback((variant: ToastVariant, message: string) => {
    nextId += 1;
    const id = `toast-${nextId}`;
    setToasts((current) => [...current, { id, variant, message }]);
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (message: string) => push('success', message),
      error: (message: string) => push('error', message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4">
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              variant={toast.variant}
              message={toast.message}
              onDismiss={() => dismiss(toast.id)}
            />
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}
