import { useCallback, useSyncExternalStore } from 'react';
import { isNative } from './platform';

// Evento no estándar (Chromium): el browser avisa que la app es instalable. Se le hace
// preventDefault y se guarda, así el prompt lo dispara la fila de Ajustes cuando el
// usuario quiere — no una infobar del browser cuando al browser se le canta (D7).
export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export type InstallStatus =
  /** Ya instalada, o browser que no sabe instalar: la sección no existe. */
  | 'hidden'
  /** Chrome/Edge/Android con el evento en la mano: botón que dispara el prompt nativo. */
  | 'promptable'
  /** El usuario canceló el prompt nativo; el evento se consumió y no vuelve hasta recargar. */
  | 'dismissed'
  /** iOS: Safari no dispara el evento, sólo quedan las instrucciones manuales. */
  | 'ios';

let deferred: BeforeInstallPromptEvent | null = null;
let outcome: 'installed' | 'dismissed' | null = null;
let version = 0;
const subscribers = new Set<() => void>();

function emit(): void {
  version += 1;
  subscribers.forEach((notify) => notify());
}

function subscribe(notify: () => void): () => void {
  subscribers.add(notify);
  return () => {
    subscribers.delete(notify);
  };
}

// Snapshot = un contador. El estado real (evento diferido, display-mode, UA) se lee en el
// render: devolver un objeto acá haría que `useSyncExternalStore` re-renderice sin fin.
const getVersion = () => version;

function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)')?.matches === true ||
    // iOS no soporta display-mode en matchMedia; Safari lo expone acá.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  const ua = navigator.userAgent;
  // iPadOS 13+ se hace pasar por Mac en el UA; lo delata que tenga touch.
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

function currentStatus(): InstallStatus {
  // S44 — adentro de la app de la store no hay nada que instalar: ya está instalada. Sin
  // este corte la sección aparecería igual y encima con el peor copy posible, porque `isIos()`
  // detecta el iPhone por user agent y el WebView de iOS tiene el UA de Safari: le estaríamos
  // explicando cómo "agregar a la pantalla de inicio" a alguien que bajó la app del App Store.
  if (isNative()) return 'hidden';
  if (outcome === 'installed' || isStandalone()) return 'hidden';
  if (deferred) return 'promptable';
  if (outcome === 'dismissed') return 'dismissed';
  if (isIos()) return 'ios';
  return 'hidden';
}

// Se llama desde main.tsx ANTES de montar React: `beforeinstallprompt` puede dispararse
// antes de que exista la pantalla de Ajustes, y en esa carga no se repite.
export function listenForInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    outcome = null;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    outcome = 'installed';
    emit();
  });
}

export function useInstallPrompt() {
  useSyncExternalStore(subscribe, getVersion, getVersion);

  const promptInstall = useCallback(() => {
    const event = deferred;
    if (!event) return;
    // El evento es de UN SOLO uso: un segundo prompt() sobre el mismo tira InvalidStateError.
    // No se emite todavía a propósito — la sección se queda quieta mientras el diálogo
    // nativo está abierto, y recién cambia cuando hay respuesta.
    deferred = null;
    void event.userChoice.then((choice) => {
      // 'accepted' lo confirma `appinstalled`, que es el que además dispara el toast.
      if (choice.outcome === 'dismissed') {
        outcome = 'dismissed';
        emit();
      }
    });
    void event.prompt();
  }, []);

  return {
    status: currentStatus(),
    /** true sólo si la instalación ocurrió en esta sesión (dispara el toast de éxito). */
    justInstalled: outcome === 'installed',
    promptInstall,
  };
}
