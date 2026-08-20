// S44 — Pila de interceptores del botón físico "atrás" de Android.
//
// En Android el back es una acción global, no un elemento de la pantalla: si nadie lo
// atiende, cierra la app. Con un modal abierto eso es un desastre — el usuario esperaba
// cerrar el diálogo y perdió la app entera (y el formulario que estaba llenando).
//
// Este módulo es a propósito **agnóstico de plataforma y sin dependencias de Capacitor**:
// es una pila común y silvestre. Así `Modal` se registra siempre, sin un `if (isNative())`
// adentro de un componente de UI, y los tests del Modal corren en jsdom sin mockear nada.
// El único que consulta la pila es el listener nativo de `nativeBootstrap.ts`; en la web
// nadie la lee y no pasa nada.

/** Devuelve true si consumió el back (y entonces nadie más lo ve). */
export type BackInterceptor = () => boolean;

const interceptors: BackInterceptor[] = [];

/** Registra un interceptor. Devuelve la función para darlo de baja (va en el cleanup del effect). */
export function pushBackInterceptor(interceptor: BackInterceptor): () => void {
  interceptors.push(interceptor);
  return () => {
    const index = interceptors.indexOf(interceptor);
    if (index !== -1) interceptors.splice(index, 1);
  };
}

/**
 * Corre la pila en LIFO y devuelve si alguien consumió el back.
 *
 * LIFO y no FIFO porque el orden correcto es "lo último que se abrió es lo primero que se
 * cierra": con un ConfirmDialog arriba de un Modal, el back cierra la confirmación, no el
 * modal de abajo.
 */
export function runBackInterceptors(): boolean {
  for (let index = interceptors.length - 1; index >= 0; index -= 1) {
    if (interceptors[index]()) return true;
  }
  return false;
}

/** Sólo para tests: deja la pila limpia entre casos. */
export function resetBackInterceptors(): void {
  interceptors.length = 0;
}
