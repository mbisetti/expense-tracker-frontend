import { useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { applyUpdate, getWaitingWorker, subscribeToUpdate } from '../lib/pwa';
import { Button } from './ui/Button';
import { RefreshIcon, XIcon } from './ui/icons';

// S35 — aviso de build nueva. NUNCA se recarga solo (D3): un skipWaiting silencioso a
// mitad de sesión deja los chunks lazy de la build vieja en 404, y la pantalla se rompe
// justo cuando el usuario abre un form. Recarga cuando él dice.
//
// Va abajo a propósito: los toasts de mutación (ToastProvider) se apilan arriba y este
// puede quedarse un rato largo en pantalla.
export function UpdateToast() {
  const waiting = useSyncExternalStore(subscribeToUpdate, getWaitingWorker, () => null);
  // Se guarda el worker descartado, no un booleano: si más tarde llega OTRA build, el
  // aviso vuelve a aparecer.
  const [dismissed, setDismissed] = useState<ServiceWorker | null>(null);

  if (!waiting || waiting === dismissed) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 pb-[var(--safe-bottom)]">
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-md border-l-4 border-l-brand bg-surface-elevated p-4 shadow-md"
      >
        <RefreshIcon className="h-5 w-5 shrink-0 text-brand" />
        <p className="flex-1 text-sm text-ink">Hay una versión nueva.</p>
        <Button type="button" size="sm" onClick={applyUpdate}>
          Actualizar
        </Button>
        <button
          type="button"
          onClick={() => setDismissed(waiting)}
          aria-label="Ahora no"
          className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-sm text-muted transition-colors duration-200 ease-out hover:bg-surface-sunken hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>
    </div>,
    document.body,
  );
}
