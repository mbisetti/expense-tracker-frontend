import { ApiError } from '../../lib/http';

export function transferErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'Algo salió mal. Intentá de nuevo.';
  }
  switch (error.code) {
    case 'SAME_ACCOUNT_TRANSFER':
      return 'Elegí cuentas distintas, o monedas distintas dentro de la misma cuenta.';
    case 'SAME_CURRENCY_AMOUNT_MISMATCH':
      return 'Entre la misma moneda, los montos deben coincidir.';
    case 'CURRENCY_MISMATCH':
      return 'Las tarjetas de crédito solo aceptan su propia moneda.';
    case 'INSUFFICIENT_BALANCE':
      return 'La cuenta de origen no tiene saldo suficiente.';
    case 'ACCOUNT_NOT_FOUND':
      return 'Alguna de las cuentas no existe.';
    case 'TRANSFER_NOT_FOUND':
      return 'La transferencia no existe o ya fue borrada.';
    case 'VALIDATION_ERROR':
      return 'Revisá los datos del formulario.';
    default:
      return 'Algo salió mal. Intentá de nuevo.';
  }
}
