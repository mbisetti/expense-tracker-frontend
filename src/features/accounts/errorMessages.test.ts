import { describe, expect, it } from 'vitest';
import { ApiError } from '../../lib/http';
import { accountErrorMessage } from './errorMessages';

describe('accountErrorMessage', () => {
  it.each([
    [
      'ACCOUNT_HAS_TRANSACTIONS',
      'No se puede borrar: la cuenta tiene transacciones. Borrá o mové las transacciones primero.',
    ],
    ['CURRENCY_LOCKED', 'No se puede cambiar la moneda: la cuenta ya tiene transacciones.'],
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
