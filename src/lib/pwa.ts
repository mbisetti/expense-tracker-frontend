// Service worker de la PWA (S35). El SW lo genera vite-plugin-pwa (Workbox) en el build;
// acá va sólo el lado cliente: registrarlo, enterarse de que hay una build nueva esperando
// y aplicarla cuando el usuario lo pide.
//
// NO se usa `virtual:pwa-register` del plugin: es un módulo virtual que sólo existe cuando
// el plugin está cargado, y vitest corre con su propia config (sin el plugin) — importarlo
// rompería cualquier test que toque este archivo. La API nativa alcanza de sobra.

// Cada cuánto se le pregunta al server si cambió el sw.js. Mismo criterio que el poll de la
// campanita (S34): suave, y además al volver el foco a la pestaña.
const UPDATE_CHECK_MS = 60 * 60 * 1000;

let waiting: ServiceWorker | null = null;
const subscribers = new Set<() => void>();

function setWaiting(worker: ServiceWorker | null): void {
  if (waiting === worker) return;
  waiting = worker;
  subscribers.forEach((notify) => notify());
}

// Store externo mínimo para `useSyncExternalStore`: el registro vive fuera de React (arranca
// en main.tsx, antes del render) y el toast se suscribe cuando monta.
export function subscribeToUpdate(notify: () => void): () => void {
  subscribers.add(notify);
  return () => {
    subscribers.delete(notify);
  };
}

export function getWaitingWorker(): ServiceWorker | null {
  return waiting;
}

// El SW generado con `registerType: 'prompt'` NO hace skipWaiting solo (D3): se queda en
// waiting hasta recibir este mensaje. Recién cuando toma el control (`controllerchange`)
// recargamos, ya con la build nueva sirviendo.
export function applyUpdate(): void {
  const worker = waiting;
  if (!worker) return;
  navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), {
    once: true,
  });
  worker.postMessage({ type: 'SKIP_WAITING' });
}

function watchRegistration(registration: ServiceWorkerRegistration): void {
  // Ya había una build nueva esperando de antes (pestaña que quedó abierta desde ayer).
  if (registration.waiting && navigator.serviceWorker.controller) {
    setWaiting(registration.waiting);
  }

  registration.addEventListener('updatefound', () => {
    const installing = registration.installing;
    if (!installing) return;
    installing.addEventListener('statechange', () => {
      // `controller` presente significa que ya había un SW sirviendo la app: esto es un
      // update. En la PRIMERA instalación no hay nada que recargar → sin toast.
      if (installing.state === 'installed' && navigator.serviceWorker.controller) {
        setWaiting(installing);
      }
    });
  });

  const checkForUpdate = () => {
    void registration.update();
  };
  window.setInterval(checkForUpdate, UPDATE_CHECK_MS);
  window.addEventListener('focus', checkForUpdate);
}

// Se llama desde main.tsx, gateado por `import.meta.env.PROD`: ni dev ni vitest registran
// nada. Si el registro falla, la app sigue andando contra la red — un SW roto no puede
// dejar a nadie afuera.
export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;

  const register = () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(watchRegistration)
      .catch(() => {});
  };

  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}
