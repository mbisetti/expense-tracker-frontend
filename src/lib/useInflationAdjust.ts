import { useSyncExternalStore } from 'react';

// S49 (D11) — "ajustar por inflación", prendido o apagado. Es UNO SOLO para el Dashboard y para
// Gastos: prenderlo en una pantalla lo prende en la otra.
//
// Vive en localStorage y no en el perfil del usuario: S48 dejó fuera las preferencias
// persistidas del server y no hay razón para abrir esa puerta por un toggle de vista.
//
// `useSyncExternalStore` y no un estado por pantalla: las dos pantallas leen la MISMA fuente y
// se enteran del cambio sin remontarse ni levantar un contexto. El snapshot lee el storage cada
// vez (es un booleano: comparar por valor alcanza y no hay caché que quede vieja), así que no
// hay estado de módulo que se filtre entre tests.
//
// Si el storage falla (modo privado, storage bloqueado) arranca apagado y sigue funcionando: es
// una preferencia de vista, no un dato.

const STORAGE_KEY = 'inflationAdjusted';
const EVENT = 'maat:inflation-adjust';

function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener(EVENT, onStoreChange);
  // Otra pestaña abierta: el evento `storage` sólo llega a las OTRAS pestañas, así que las dos
  // vías juntas cubren "misma pestaña" y "otra pestaña".
  window.addEventListener('storage', onStoreChange);
  return () => {
    window.removeEventListener(EVENT, onStoreChange);
    window.removeEventListener('storage', onStoreChange);
  };
}

function getSnapshot(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setInflationAdjust(next: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
  } catch {
    // Sin storage el toggle queda apagado y la pantalla sigue mostrando montos nominales. Es una
    // preferencia de vista: degradar en silencio es correcto, romper la pantalla no.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function useInflationAdjust(): [boolean, (next: boolean) => void] {
  return [useSyncExternalStore(subscribe, getSnapshot), setInflationAdjust];
}
