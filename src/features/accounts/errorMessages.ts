import { ApiError } from '../../lib/http';

export function accountErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'Algo salió mal. Intentá de nuevo.';
  }
  switch (error.code) {
    case 'ACCOUNT_HAS_TRANSACTIONS':
      return 'No se puede borrar: la cuenta tiene transacciones. Borrá o mové las transacciones primero.';
    case 'CURRENCY_LOCKED':
      return 'No se puede cambiar la moneda: la cuenta ya tiene transacciones.';
    case 'ACCOUNT_NOT_FOUND':
      return 'La cuenta no existe.';
    case 'VALIDATION_ERROR':
      return 'Revisá los datos del formulario.';
    default:
      return 'Algo salió mal. Intentá de nuevo.';
  }
}
