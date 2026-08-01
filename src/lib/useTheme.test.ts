import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { applyStoredTheme, useTheme } from './useTheme';

function themeColor(): string | null | undefined {
  return document.querySelector('meta[name="theme-color"]')?.getAttribute('content');
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  document.head.innerHTML = '<meta name="theme-color" content="#000000" />';
});

describe('useTheme', () => {
  it('applyStoredTheme aplica el tema guardado y sincroniza la theme-color', () => {
    localStorage.setItem('theme', 'dark');

    applyStoredTheme();

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(themeColor()).toBe('#0c0a09');
  });

  // Sin preferencia guardada `data-theme` NO se toca (manda prefers-color-scheme), pero la
  // meta sí se resuelve: una meta no entiende de media queries.
  it('sin tema guardado deja data-theme sin tocar y usa la theme-color del sistema', () => {
    applyStoredTheme();

    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    expect(themeColor()).toBe('#fafaf9');
  });

  it('el toggle mueve la theme-color junto con el tema', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');

    act(() => result.current.toggle());

    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(themeColor()).toBe('#0c0a09');

    act(() => result.current.toggle());

    expect(themeColor()).toBe('#fafaf9');
  });

  it('no explota si la página no tiene la meta', () => {
    document.head.innerHTML = '';
    expect(() => applyStoredTheme()).not.toThrow();
  });
});
