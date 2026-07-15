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
    case 'NOT_A_CREDIT_ACCOUNT':
      return 'Los datos de ciclo son sólo para tarjetas de crédito.';
    case 'INCOMPLETE_STATEMENT_CONFIG':
      return 'Completá el día de cierre y el de vencimiento juntos.';
    case 'STATEMENT_NOT_CONFIGURED':
      return 'Esta tarjeta no tiene ciclo configurado.';
    default:
      return 'Algo salió mal. Intentá de nuevo.';
  }
}
