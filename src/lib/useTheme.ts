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

// Mismos valores que `--bg` en index.css. El manifest no tiene variante dark: instalada,
// la status bar de Android toma el color de esta meta, así que si no se sincroniza queda
// pegada al default del index.html y se ve una franja ajena arriba de la app (S35).
const THEME_COLOR: Record<Theme, string> = {
  light: '#fafaf9',
  dark: '#0c0a09',
};

function applyThemeColor(theme: Theme): void {
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
}

// Aplica el tema guardado (si hay) en el arranque, ANTES del render, para no flashear el
// tema del sistema. Se llama desde main.tsx. Si no hay preferencia guardada, no se toca
// `data-theme` y manda `prefers-color-scheme` (ambos temas son ciudadanos de primera, §0)
// — pero la theme-color sí se resuelve, porque una meta no entiende de media queries.
export function applyStoredTheme(): void {
  const stored = storedTheme();
  if (stored) document.documentElement.setAttribute('data-theme', stored);
  applyThemeColor(stored ?? systemTheme());
}

// Toggle manual que pisa al sistema (`data-theme` en el root, §1.1 design-principles) y
// persiste la elección. El estado arranca del guardado o, si no hay, del sistema.
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => storedTheme() ?? systemTheme());

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    applyThemeColor(next);
    localStorage.setItem(STORAGE_KEY, next);
    setTheme(next);
  };

  return { theme, toggle };
}
