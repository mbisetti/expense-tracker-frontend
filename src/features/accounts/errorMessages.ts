import { ApiError } from '../../lib/http';

export function accountErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'Algo salió mal. Intentá de nuevo.';
  }
  switch (error.code) {
    case 'ACCOUNT_HAS_TRANSACTIONS':
      return 'No se puede borrar: la cuenta tiene transacciones. Borrá o mové las transacciones primero.';
    case 'CURRENCY_LOCKED':
      return 'No se puede cambiar la moneda: la tarjeta de crédito ya tiene transacciones.';
    case 'CURRENCY_MISMATCH':
      // Convertir a crédito una cuenta con movimientos fuera de su moneda principal (S22 FR-14).
      return 'No se puede volver tarjeta de crédito: tiene movimientos en otra moneda.';
    case 'ACCOUNT_NOT_FOUND':
      return 'La cuenta no existe.';
    case 'VALIDATION_ERROR':
      return 'Revisá los datos del formulario.';
    case 'INVALID_LINKED_ACCOUNT':
      // Sprint 22.2: la madre de una tarjeta tiene que ser un banco o billetera; o se quiso
      // cambiar el tipo de una cuenta que tiene tarjetas colgando.
      return 'La tarjeta tiene que colgar de un banco o billetera. Si esta cuenta tiene tarjetas, no podés cambiarle el tipo.';
    case 'NOT_A_CREDIT_ACCOUNT':
      // Reusa el código para dos casos: días de ciclo en una no-CREDIT (400) y vincular una
      // cuenta que no es tarjeta de crédito (409). El copy cubre ambos.
      return 'Sólo las tarjetas de crédito tienen ciclo y pueden vincularse a una cuenta madre.';
    case 'INCOMPLETE_STATEMENT_CONFIG':
      return 'Completá el día de cierre y el de vencimiento juntos.';
    case 'STATEMENT_NOT_CONFIGURED':
      return 'Esta tarjeta no tiene ciclo configurado.';
    default:
      return 'Algo salió mal. Intentá de nuevo.';
  }
}
