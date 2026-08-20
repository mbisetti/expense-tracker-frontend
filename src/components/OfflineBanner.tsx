import { useSyncExternalStore } from 'react';
import { WifiOffIcon } from './ui/icons';
import {
  getOnlineServerSnapshot,
  getOnlineSnapshot,
  subscribeOnline,
} from '../lib/onlineStatus';

// S35 — offline honesto (D8). Instalada, la app ABRE sin red (el shell está precacheado)
// pero los datos no están: no se simula nada ni se sirve un saldo viejo como si fuera de
// ahora. Se dice, y las queries fallan con sus errores normales.
export function OfflineBanner() {
  // S44: el estado sale de `lib/onlineStatus` en vez de `navigator.onLine` directo. En el
  // browser es lo mismo de siempre; adentro de la app nativa el valor lo provee el plugin
  // Network, porque el WKWebView de iOS miente y siempre dice que hay conexión.
  const online = useSyncExternalStore(
    subscribeOnline,
    getOnlineSnapshot,
    getOnlineServerSnapshot,
  );

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-2 bg-warning/10 px-4 py-1.5 text-sm text-warning"
    >
      <WifiOffIcon className="h-4 w-4 shrink-0" />
      <span>Sin conexión: los datos no se actualizan hasta que vuelva.</span>
    </div>
  );
}
