// S44 — Fuente única de "¿hay conexión?".
//
// Hasta S35 el `OfflineBanner` leía `navigator.onLine` y los eventos `online`/`offline` del
// window, que es lo correcto en el browser. Adentro de la app nativa no alcanza: en el
// WKWebView de iOS `navigator.onLine` se queda pegado en `true` aunque el teléfono esté en
// modo avión, así que el banner no aparecería nunca — justo en el caso en que más importa,
// porque la app se abre igual (shell precacheado) pero los datos no están (D8).
//
// La solución es un override opcional: en la web `nativeOnline` queda en null y todo se
// comporta byte por byte como antes (los tests del banner no se tocaron). En nativo,
// `bootstrapNative()` engancha el plugin Network y empuja el valor de verdad acá.

let nativeOnline: boolean | null = null;
const subscribers = new Set<() => void>();

export function subscribeOnline(notify: () => void): () => void {
  subscribers.add(notify);
  window.addEventListener('online', notify);
  window.addEventListener('offline', notify);
  return () => {
    subscribers.delete(notify);
    window.removeEventListener('online', notify);
    window.removeEventListener('offline', notify);
  };
}

/** `null` (web) = manda el browser. En nativo manda lo que reportó el plugin Network. */
export function getOnlineSnapshot(): boolean {
  return nativeOnline ?? navigator.onLine;
}

/** Snapshot de servidor (SSR//hidratación): se asume con conexión, igual que antes. */
export function getOnlineServerSnapshot(): boolean {
  return true;
}

/** La llama sólo el bootstrap nativo. En la web nadie la llama y el override no existe. */
export function setNativeOnline(value: boolean): void {
  if (nativeOnline === value) return;
  nativeOnline = value;
  subscribers.forEach((notify) => notify());
}
