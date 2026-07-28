import { useState } from 'react';

const STORAGE_KEY = 'expensesSections';

function stored(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

// S29.1: abierto/colapsado por sección de la tab Gastos, persistido (patrón tema/dateFormat).
// El hash de la URL gana EN EL ARRANQUE: /expenses#recurrentes abre esa sección aunque haya
// quedado colapsada — deep-link listo para el bot/notificaciones del roadmap. Se resuelve en
// el initial state, no en un effect (la regla set-state-in-effect es error en este repo).
export function useSectionsOpen(defaults: Record<string, boolean>) {
  const [map, setMap] = useState<Record<string, boolean>>(() => {
    const hash = window.location.hash.slice(1);
    return {
      ...defaults,
      ...stored(),
      ...(hash && hash in defaults ? { [hash]: true } : {}),
    };
  });

  const setOpen = (id: string, open: boolean) =>
    setMap((prev) => {
      const next = { ...prev, [id]: open };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });

  return {
    isOpen: (id: string) => map[id] ?? true,
    toggle: (id: string) => setOpen(id, !(map[id] ?? true)),
    open: (id: string) => setOpen(id, true),
  };
}
