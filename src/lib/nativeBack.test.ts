import { afterEach, describe, expect, it, vi } from 'vitest';
import { pushBackInterceptor, resetBackInterceptors, runBackInterceptors } from './nativeBack';

afterEach(() => {
  resetBackInterceptors();
});

describe('pila del botón atrás (Android)', () => {
  it('sin interceptores no consume nada: el back sigue de largo al historial', () => {
    expect(runBackInterceptors()).toBe(false);
  });

  it('un interceptor que devuelve true consume el back', () => {
    pushBackInterceptor(() => true);
    expect(runBackInterceptors()).toBe(true);
  });

  it('corre en LIFO: con un ConfirmDialog arriba de un Modal, cierra la confirmación primero', () => {
    const orden: string[] = [];
    pushBackInterceptor(() => {
      orden.push('modal');
      return true;
    });
    pushBackInterceptor(() => {
      orden.push('confirm');
      return true;
    });

    runBackInterceptors();

    // El de abajo NO se entera: el de arriba ya lo consumió.
    expect(orden).toEqual(['confirm']);
  });

  it('un interceptor que devuelve false le pasa el back al de abajo', () => {
    const abajo = vi.fn(() => true);
    pushBackInterceptor(abajo);
    pushBackInterceptor(() => false);

    expect(runBackInterceptors()).toBe(true);
    expect(abajo).toHaveBeenCalledOnce();
  });

  it('darse de baja lo saca de la pila (es el cleanup del effect al cerrar el modal)', () => {
    const baja = pushBackInterceptor(() => true);
    baja();
    expect(runBackInterceptors()).toBe(false);
  });

  it('dar de baja uno del medio no descoloca a los otros', () => {
    const primero = vi.fn(() => true);
    pushBackInterceptor(primero);
    const bajaMedio = pushBackInterceptor(() => true);
    const ultimo = vi.fn(() => false);
    pushBackInterceptor(ultimo);

    bajaMedio();
    runBackInterceptors();

    expect(ultimo).toHaveBeenCalledOnce();
    expect(primero).toHaveBeenCalledOnce();
  });
});
