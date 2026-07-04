import { describe, expect, it } from 'vitest';
import { ApiError } from '../../lib/http';
import { paymentMethodErrorMessage } from './errorMessages';

describe('paymentMethodErrorMessage', () => {
  it.each([
    ['PAYMENT_METHOD_NOT_FOUND', 'El método de pago no existe o fue borrado.'],
    ['VALIDATION_ERROR', 'Revisá los datos del formulario.'],
  ])('mapea %s a mensaje claro', (code, expected) => {
    expect(paymentMethodErrorMessage(new ApiError(400, code, 'raw'))).toBe(expected);
  });

  it('un 403 u otro código desconocido cae en el mensaje genérico', () => {
    // payment-methods no tiene códigos 403 propios (CATEGORY_NOT_EDITABLE es de categories)
    expect(paymentMethodErrorMessage(new ApiError(403, 'FORBIDDEN', 'raw'))).toBe(
      'Algo salió mal. Intentá de nuevo.',
    );
  });

  it('errores que no son ApiError caen en el mensaje genérico', () => {
    expect(paymentMethodErrorMessage(new Error('boom'))).toBe(
      'Algo salió mal. Intentá de nuevo.',
    );
  });
});
