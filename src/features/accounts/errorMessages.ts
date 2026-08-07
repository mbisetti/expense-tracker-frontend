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
    // S40 (bloque B): préstamos.
    case 'INVALID_LOAN_CONFIG':
      return 'Completá los cuatro datos del préstamo juntos: cuota, cantidad, día de vencimiento y fecha de inicio.';
    case 'NOT_A_DEBT_ACCOUNT':
      return 'El préstamo sólo se configura en una cuenta de deuda.';
    // S40 (bloque A): rendimiento y ajustes.
    case 'NOT_AN_INVESTMENT_ACCOUNT':
      return 'El rendimiento sólo aplica a cuentas de inversión.';
    case 'NOT_AN_ADJUSTABLE_ACCOUNT':
      return 'Sólo se puede actualizar el valor de una inversión, una cripto o una deuda.';
    case 'INVALID_ACCOUNT_URL':
      return 'El link tiene que ser una dirección web (empezar con http:// o https://).';
    case 'INVALID_ADJUSTMENT_TARGET':
      return 'El valor de hoy no puede ser negativo.';
    // S43: tenencias cripto.
    case 'NOT_A_CRYPTO_ACCOUNT':
      return 'Las tenencias sólo aplican a cuentas de cripto.';
    case 'DUPLICATE_HOLDING':
      return 'Ya tenés esa moneda cargada. Editá la que ya está en vez de agregarla de nuevo.';
    case 'HOLDING_NOT_FOUND':
      return 'Esa tenencia no existe. Puede que la hayas borrado en otra pestaña.';
    case 'INSUFFICIENT_HOLDING':
      // El server manda el símbolo aparte para que el copy pueda decir CUÁL falta sin parsear el
      // mensaje. Es la diferencia entre "no alcanza" y "cargá primero tu tenencia de BNB".
      return typeof error.body?.symbol === 'string'
        ? `No te alcanza el ${error.body.symbol}. Si la comisión te la cobraron en esa moneda, cargá primero tu tenencia.`
        : 'No te alcanza esa tenencia para la operación.';
    case 'INCOMPLETE_HOLDING_FEE':
      return 'Para una comisión en cripto completá la moneda y la cantidad juntas.';
    case 'ACCOUNT_HAS_HOLDINGS':
      return 'No se puede cambiar la moneda: la cuenta tiene tenencias cargadas, y lo que pusiste en cada una está en la moneda actual. Borralas primero.';
    default:
      return 'Algo salió mal. Intentá de nuevo.';
  }
}
