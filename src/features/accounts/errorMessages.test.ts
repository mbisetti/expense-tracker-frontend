import { describe, expect, it } from 'vitest';
import { ApiError } from '../../lib/http';
import { accountErrorMessage } from './errorMessages';

describe('accountErrorMessage', () => {
  it.each([
    [
      'ACCOUNT_HAS_TRANSACTIONS',
      'No se puede borrar: la cuenta tiene transacciones. Borrá o mové las transacciones primero.',
    ],
    ['CURRENCY_LOCKED', 'No se puede cambiar la moneda: la tarjeta de crédito ya tiene transacciones.'],
    ['CURRENCY_MISMATCH', 'No se puede volver tarjeta de crédito: tiene movimientos en otra moneda.'],
    ['ACCOUNT_NOT_FOUND', 'La cuenta no existe.'],
    ['VALIDATION_ERROR', 'Revisá los datos del formulario.'],
  ])('mapea %s a mensaje claro', (code, expected) => {
    expect(accountErrorMessage(new ApiError(409, code, 'raw'))).toBe(expected);
  });

  it('devuelve mensaje genérico para códigos desconocidos y errores no-API', () => {
    expect(accountErrorMessage(new ApiError(500, 'X', 'raw'))).toBe(
      'Algo salió mal. Intentá de nuevo.',
    );
    expect(accountErrorMessage(new Error('boom'))).toBe('Algo salió mal. Intentá de nuevo.');
  });
});

// ── S43: tenencias cripto ───────────────────────────────────────────────────────────────────

describe('accountErrorMessage — tenencias (S43)', () => {
  it.each([
    ['NOT_A_CRYPTO_ACCOUNT', /sólo aplican a cuentas de cripto/],
    ['DUPLICATE_HOLDING', /Editá la que ya está/],
    ['HOLDING_NOT_FOUND', /no existe/],
    ['INCOMPLETE_HOLDING_FEE', /la moneda y la cantidad juntas/],
    ['ACCOUNT_HAS_HOLDINGS', /tenencias cargadas/],
  ])('mapea %s a un mensaje accionable', (code, pattern) => {
    expect(accountErrorMessage(new ApiError(400, code, 'raw'))).toMatch(pattern);
  });

  it('INSUFFICIENT_HOLDING dice CUÁL moneda falta, sin parsear el mensaje del server', () => {
    // El símbolo viaja como campo propio del body justamente para esto: la diferencia entre
    // "no alcanza" y "cargá primero tu tenencia de BNB" es si el usuario sabe qué hacer.
    const error = new ApiError(400, 'INSUFFICIENT_HOLDING', 'raw', { symbol: 'BNB' });
    expect(accountErrorMessage(error)).toContain('BNB');
  });

  it('INSUFFICIENT_HOLDING degrada con gracia si el símbolo no vino', () => {
    expect(accountErrorMessage(new ApiError(400, 'INSUFFICIENT_HOLDING', 'raw'))).toBe(
      'No te alcanza esa tenencia para la operación.',
    );
  });
});
