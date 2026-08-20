// S44 — Capa de plataforma. Único lugar de la app que responde "¿estamos adentro de la app
// nativa o en el browser?".
//
// La regla que ordena todo el sprint: **la web no cambia de comportamiento**. Cada
// adaptación nativa entra detrás de un `isNative()`, nunca reemplazando el camino web. Son
// 598 tests y una app en producción; el costo de un `if` es cero al lado de una regresión
// silenciosa en el navegador.
//
// NO se importa `@capacitor/core`: se lee el objeto global que el bridge inyecta.
//
// Medido sobre el chunk de entrada (el que TODO visitante de la web descarga sí o sí):
//
//   641.798 B  sin S44
//   644.286 B  con S44 leyendo el global      ← lo que hay
//   651.782 B  con S44 importando el core
//
// O sea: importar `@capacitor/core` acá costaba 7,3 KB de más en el camino crítico de toda la
// app, para responder una pregunta booleana que en el browser siempre da lo mismo. `http.ts`
// importa este módulo, así que el core se colaba en el entry. Así como está, S44 le suma 2,4 KB
// a la web y nada más: los plugins se siguen importando, pero dinámicamente y sólo desde las
// ramas nativas, así que Vite los manda a chunks que el browser jamás pide.
//
// Leer el global no es un truco: es lo mismo que hace el propio core por dentro. En nativo el
// bridge se inyecta antes de que corra el bundle de la app, así que ya está disponible cuando
// `http.ts` resuelve la base de la API en el momento de cargar el módulo.
//
// Tampoco se sniffea el user agent: adentro del WebView el UA es el de Chrome/Safari a secas,
// así que un sniff diría "web" estando en la app.
type BridgeGlobal = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
};

function bridge(): BridgeGlobal | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as Window & { Capacitor?: BridgeGlobal }).Capacitor;
}

export type AppPlatform = 'web' | 'ios' | 'android';

/**
 * Dónde está corriendo el código. En vitest y en el dev server siempre es `'web'`: el core
 * de Capacitor no encuentra bridge y cae al default, así que los tests existentes no ven
 * nada nuevo y no hace falta mockear nada.
 */
export function getPlatform(): AppPlatform {
  const platform = bridge()?.getPlatform?.();
  return platform === 'ios' || platform === 'android' ? platform : 'web';
}

/**
 * true sólo adentro de la app empaquetada (iOS o Android). El caso de uso de casi todos los
 * llamadores: "¿tengo plugins nativos disponibles?".
 *
 * OJO — no confundir con `isIos()` de `useInstallPrompt.ts`, que detecta **Safari en un
 * iPhone** (browser) para mostrar las instrucciones de "Agregar a pantalla de inicio". Son
 * preguntas opuestas: aquella es "web en un iPhone", ésta es "app instalada de la store".
 */
export function isNative(): boolean {
  return bridge()?.isNativePlatform?.() === true;
}

/** Nativo Y iOS. Para lo que difiere entre plataformas: status bar, back button, safe areas. */
export function isNativeIos(): boolean {
  return getPlatform() === 'ios';
}

/** Nativo Y Android. Ver `isNativeIos`. */
export function isNativeAndroid(): boolean {
  return getPlatform() === 'android';
}
