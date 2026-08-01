import { describe, expect, it } from 'vitest';
import { queryClient } from './queryClient';
import { ApiError } from './http';

/**
 * Hallazgo F1 — la política de retry del QueryClient.
 *
 * Sin este test, `retry` es una función que nadie ejecuta: cualquiera podría volver al default
 * de fábrica sin romper nada visible, y el síntoma (esperar ~7 segundos para ver un error de
 * negocio) no aparece en ningún assert.
 */
describe('queryClient — política de retry', () => {
  const retry = queryClient.getDefaultOptions().queries?.retry as (
    failureCount: number,
    error: Error,
  ) => boolean;

  it('no reintenta errores 4xx: el server va a contestar lo mismo', () => {
    expect(retry(0, new ApiError(404, 'NOT_FOUND', 'no existe'))).toBe(false);
    expect(retry(0, new ApiError(422, 'INSUFFICIENT_BALANCE', 'no alcanza'))).toBe(false);
    expect(retry(0, new ApiError(400, 'VALIDATION_ERROR', 'mal'))).toBe(false);
    expect(retry(0, new ApiError(401, 'UNAUTHORIZED', 'sin sesión'))).toBe(false);
    expect(retry(0, new ApiError(409, 'CONCURRENT_MODIFICATION', 'chocaste'))).toBe(false);
  });

  it('reintenta 5xx y fallas de red, pero acotado', () => {
    expect(retry(0, new ApiError(500, 'INTERNAL_ERROR', 'boom'))).toBe(true);
    expect(retry(1, new ApiError(503, 'UNAVAILABLE', 'boom'))).toBe(true);
    expect(retry(2, new ApiError(500, 'INTERNAL_ERROR', 'boom'))).toBe(false);
    // Una falla de red no llega como ApiError (fetch rechaza antes).
    expect(retry(0, new TypeError('Failed to fetch'))).toBe(true);
  });

  it('las mutaciones no se reintentan: un POST repetido es un gasto duplicado', () => {
    expect(queryClient.getDefaultOptions().mutations?.retry).toBe(false);
  });
});
