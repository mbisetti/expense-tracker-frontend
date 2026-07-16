import { useState } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

function systemTheme(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light';
}

function storedTheme(): Theme | null {
  const v = localStorage.getItem(STORAGE_KEY);
  return v === 'light' || v === 'dark' ? v : null;
}

// Aplica el tema guardado (si hay) en el arranque, ANTES del render, para no flashear el
// tema del sistema. Se llama desde main.tsx. Si no hay preferencia guardada, no se toca
// `data-theme` y manda `prefers-color-scheme` (ambos temas son ciudadanos de primera, §0).
export function applyStoredTheme(): void {
  const stored = storedTheme();
  if (stored) document.documentElement.setAttribute('data-theme', stored);
}

// Toggle manual que pisa al sistema (`data-theme` en el root, §1.1 design-principles) y
// persiste la elección. El estado arranca del guardado o, si no hay, del sistema.
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => storedTheme() ?? systemTheme());

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(STORAGE_KEY, next);
    setTheme(next);
  };

  return { theme, toggle };
}
