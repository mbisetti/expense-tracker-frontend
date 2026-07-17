import { describe, expect, it } from 'vitest';
import { ApiError } from '../../lib/http';
import { transactionErrorMessage } from './errorMessages';

describe('transactionErrorMessage', () => {
  it.each([
    ['INSUFFICIENT_BALANCE', 'Saldo insuficiente en la cuenta para este gasto.'],
    ['CURRENCY_MISMATCH', 'Las tarjetas de crédito solo aceptan su propia moneda.'],
    ['VALIDATION_ERROR', 'Revisá los datos del formulario.'],
    ['IMMUTABLE_FIELD', 'La cuenta, el tipo y la moneda no se pueden modificar.'],
    ['TRANSACTION_NOT_FOUND', 'La transacción no existe o fue borrada.'],
  ])('mapea %s a mensaje claro', (code, expected) => {
    expect(transactionErrorMessage(new ApiError(400, code, 'raw'))).toBe(expected);
  });

  it('devuelve mensaje genérico para códigos desconocidos', () => {
    expect(transactionErrorMessage(new ApiError(500, 'WHATEVER', 'raw'))).toBe(
      'Algo salió mal. Intentá de nuevo.',
    );
  });

  it('devuelve mensaje genérico para errores que no son ApiError', () => {
    expect(transactionErrorMessage(new Error('boom'))).toBe(
      'Algo salió mal. Intentá de nuevo.',
    );
  });
});
