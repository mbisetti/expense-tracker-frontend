import { useSyncExternalStore } from 'react';
import { WifiOffIcon } from './ui/icons';

function subscribe(notify: () => void): () => void {
  window.addEventListener('online', notify);
  window.addEventListener('offline', notify);
  return () => {
    window.removeEventListener('online', notify);
    window.removeEventListener('offline', notify);
  };
}

// S35 — offline honesto (D8). Instalada, la app ABRE sin red (el shell está precacheado)
// pero los datos no están: no se simula nada ni se sirve un saldo viejo como si fuera de
// ahora. Se dice, y las queries fallan con sus errores normales.
export function OfflineBanner() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-2 bg-warning/10 px-4 py-1.5 text-sm text-warning"
    >
      <WifiOffIcon className="h-4 w-4 shrink-0" />
      <span>Sin conexión — los datos no se actualizan hasta que vuelva.</span>
    </div>
  );
}
