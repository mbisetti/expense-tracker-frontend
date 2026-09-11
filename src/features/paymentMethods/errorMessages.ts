import { ApiError } from '../../lib/http';

export function paymentMethodErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'Algo salió mal. Intentá de nuevo.';
  }
  switch (error.code) {
    case 'PAYMENT_METHOD_NOT_FOUND':
      return 'El método de pago no existe o fue borrado.';
    // S50 (D4): los tres del predeterminado por cuenta.
    case 'CARD_NOT_OF_ACCOUNT':
      return 'Esa tarjeta no es de esta cuenta.';
    case 'CARD_IS_METHOD':
      return 'Una tarjeta vinculada ya es el método de pago.';
    case 'DEFAULT_METHOD_AMBIGUOUS':
      return 'Elegí un método o una tarjeta, no las dos.';
    case 'VALIDATION_ERROR':
      return 'Revisá los datos del formulario.';
    default:
      return 'Algo salió mal. Intentá de nuevo.';
  }
}
