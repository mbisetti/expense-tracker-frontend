import { ApiError } from '../../lib/http';

export function transactionErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'Algo salió mal. Intentá de nuevo.';
  }
  switch (error.code) {
    case 'INSUFFICIENT_BALANCE':
      return 'Saldo insuficiente en la cuenta para este gasto.';
    case 'CURRENCY_MISMATCH':
      return 'La moneda no coincide con la de la cuenta.';
    case 'VALIDATION_ERROR':
      return 'Revisá los datos del formulario.';
    case 'IMMUTABLE_FIELD':
      return 'La cuenta, el tipo y la moneda no se pueden modificar.';
    case 'ACCOUNT_NOT_FOUND':
      return 'La cuenta seleccionada no existe.';
    case 'CATEGORY_NOT_FOUND':
      return 'La categoría seleccionada no existe.';
    case 'PAYMENT_METHOD_NOT_FOUND':
      return 'El método de pago seleccionado no existe.';
    case 'TRANSACTION_NOT_FOUND':
      return 'La transacción no existe o fue borrada.';
    default:
      return 'Algo salió mal. Intentá de nuevo.';
  }
}
