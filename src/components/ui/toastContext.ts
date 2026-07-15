import { createContext, useContext } from 'react';

// Separado de Toast.tsx/ToastProvider.tsx a propósito: react-refresh sólo permite Fast
// Refresh en archivos que exportan ÚNICAMENTE componentes — el context/hook viven en un
// archivo aparte (no-componente) para no romper esa regla ni el "un componente = un
// archivo" de §7 design-principles.md.
export type ToastVariant = 'success' | 'error';

export type ToastContextValue = {
  success: (message: string) => void;
  error: (message: string) => void;
};

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast debe usarse dentro de <ToastProvider>');
  }
  return ctx;
}
