// S44 — Arranque de la app nativa. Todo lo que sólo existe adentro del .apk/.ipa vive acá.
//
// Se llama DESPUÉS del primer render (main.tsx). En la web sale por la primera línea y no
// carga ni un byte de Capacitor: todos los imports de plugins son dinámicos, así que Vite los
// manda a chunks que el browser nunca pide.
import { focusManager } from '@tanstack/react-query';
import { getPlatform, isNative } from './platform';
import { runBackInterceptors } from './nativeBack';
import { setNativeOnline } from './onlineStatus';

/**
 * Marca el <html> con la plataforma. Lo usa el CSS (`html.native-android` puentea las safe
 * areas que inyecta Capacitor 8) y sirve de escotilla para cualquier ajuste puntual futuro
 * sin tener que pasar la plataforma por props.
 */
function markDocument(): void {
  const root = document.documentElement;
  root.classList.add('native', `native-${getPlatform()}`);
}

/**
 * Botón físico "atrás" de Android.
 *
 * Sin esto, el back cierra la app en cualquier pantalla — incluso con un modal abierto y un
 * formulario a medio llenar. El orden es: primero los interceptores registrados (modales,
 * drawers), después el historial del router, y recién si no hay a dónde volver se sale.
 *
 * `window.history.back()` y no `navigate(-1)` porque este listener vive fuera del árbol de
 * React: el router de S19 es un `createBrowserRouter`, que escucha el historial del window,
 * así que empujar el historial es exactamente lo mismo que navegar.
 */
async function wireBackButton(): Promise<void> {
  const { App } = await import('@capacitor/app');
  await App.addListener('backButton', ({ canGoBack }) => {
    if (runBackInterceptors()) return;
    if (canGoBack) window.history.back();
    else void App.exitApp();
  });
}

/**
 * Cuando la app vuelve del fondo, las queries tienen que refrescar.
 *
 * En el browser eso lo hace solo TanStack escuchando `visibilitychange`; adentro del WebView
 * ese evento no es confiable cuando el usuario cambia de app. El proyecto tiene postura
 * explícita al respecto ("un dato viejo mostrado como actual es peor que un error",
 * `queryClient.ts`), así que se cablea el estado real de la app al focusManager.
 */
async function wireAppState(): Promise<void> {
  const { App } = await import('@capacitor/app');
  await App.addListener('appStateChange', ({ isActive }) => {
    focusManager.setFocused(isActive);
  });
}

/** Conexión real desde el SO, porque `navigator.onLine` miente en iOS (ver `onlineStatus.ts`). */
async function wireNetwork(): Promise<void> {
  const { Network } = await import('@capacitor/network');
  const status = await Network.getStatus();
  setNativeOnline(status.connected);
  await Network.addListener('networkStatusChange', ({ connected }) => {
    setNativeOnline(connected);
  });
}

/**
 * Esconde el splash recién cuando hay algo pintado.
 *
 * `launchAutoHide: false` en la config es la otra mitad de esto: si el splash se ocultara
 * solo a los N milisegundos, entre que se va y que React pinta quedaría un hueco de fondo
 * pelado. Dos `requestAnimationFrame` = "después del primer frame realmente pintado".
 */
async function hideSplash(): Promise<void> {
  const { SplashScreen } = await import('@capacitor/splash-screen');
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
  await SplashScreen.hide();
}

/**
 * Punto de entrada único. No tira nunca: si un plugin falla, la app tiene que seguir
 * andando igual (peor con la status bar fea que sin app).
 */
export async function bootstrapNative(): Promise<void> {
  if (!isNative()) return;

  markDocument();

  const steps = [wireBackButton(), wireAppState(), wireNetwork(), hideSplash()];
  await Promise.allSettled(steps);
}
