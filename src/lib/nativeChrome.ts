// S44 — Chrome del sistema operativo (status bar) sincronizado con el tema de la app.
//
// En la web esto ya lo resuelve la meta `theme-color` (S35, ver `useTheme.ts`). Adentro de la
// app nativa esa meta no existe para el sistema: la status bar la maneja el SO y hay que
// pedirle el cambio por el plugin.
//
// El import de `@capacitor/status-bar` es **dinámico y adentro del guard** a propósito: así
// en la web el módulo nunca se carga (Vite lo manda a un chunk aparte que jamás se pide) y
// los tests existentes de `useTheme` siguen corriendo en jsdom sin mockear ningún plugin.
import { isNative } from './platform';

export type Theme = 'light' | 'dark';

/**
 * Pone el estilo de la status bar acorde al tema.
 *
 * OJO con los nombres del enum, que se leen al revés de lo que uno espera: `Style.Dark`
 * significa "texto claro sobre fondo oscuro" (o sea, el que va con NUESTRO tema dark), y
 * `Style.Light` es "texto oscuro sobre fondo claro". Se llaman por el fondo, no por la tinta.
 *
 * No se toca el color de FONDO de la status bar: desde Android 15 el edge-to-edge es
 * obligatorio y Capacitor 8 ignora `backgroundColor` y `overlaysWebView` en API 36+. El fondo
 * lo pinta el header de la app, que ya reserva el alto con `--safe-top`.
 *
 * Los errores se tragan: que no se pueda pintar la status bar no puede tirar la app abajo.
 */
export function syncStatusBar(theme: Theme): void {
  if (!isNative()) return;
  void import('@capacitor/status-bar')
    .then(({ StatusBar, Style }) =>
      StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light })
    )
    .catch(() => {});
}
