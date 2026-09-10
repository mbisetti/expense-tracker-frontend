import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useInflationAdjust } from './useInflationAdjust';

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('useInflationAdjust', () => {
  it('sin nada guardado arranca apagado', () => {
    const { result } = renderHook(() => useInflationAdjust());

    expect(result.current[0]).toBe(false);
  });

  it('lee el valor guardado', () => {
    localStorage.setItem('inflationAdjusted', '1');

    const { result } = renderHook(() => useInflationAdjust());

    expect(result.current[0]).toBe(true);
  });

  it('al cambiarlo lo persiste', () => {
    const { result } = renderHook(() => useInflationAdjust());

    act(() => result.current[1](true));

    expect(result.current[0]).toBe(true);
    expect(localStorage.getItem('inflationAdjusted')).toBe('1');

    act(() => result.current[1](false));

    expect(result.current[0]).toBe(false);
    expect(localStorage.getItem('inflationAdjusted')).toBe('0');
  });

  // D11: es UNO SOLO para el Dashboard y para Gastos. Prenderlo en una pantalla lo prende en la
  // otra sin que ninguna se remonte, que es para lo que está el useSyncExternalStore.
  it('dos consumidores ven el mismo valor, sin remontar', () => {
    const a = renderHook(() => useInflationAdjust());
    const b = renderHook(() => useInflationAdjust());

    act(() => a.result.current[1](true));

    expect(a.result.current[0]).toBe(true);
    expect(b.result.current[0]).toBe(true);
  });

  it('con el storage roto arranca apagado y no rompe la pantalla', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage bloqueado');
    });

    const { result } = renderHook(() => useInflationAdjust());

    expect(result.current[0]).toBe(false);
    expect(() => act(() => result.current[1](true))).not.toThrow();
    expect(result.current[0]).toBe(false);
  });
});
