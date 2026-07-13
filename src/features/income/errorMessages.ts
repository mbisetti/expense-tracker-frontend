import { ApiError } from '../../lib/http';

export function incomeErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'Algo salió mal. Intentá de nuevo.';
  }
  switch (error.code) {
    case 'INCOME_SOURCE_NOT_FOUND':
      return 'La fuente de ingreso no existe.';
    case 'INCOME_SOURCE_INACTIVE':
      return 'Esa fuente está desactivada. Reactivala para registrar ingresos.';
    case 'INCOME_ENTRY_NOT_FOUND':
      return 'El ingreso no existe o ya fue borrado.';
    case 'CURRENCY_MISMATCH':
      return 'La moneda de la fuente no coincide con la de la cuenta.';
    case 'ACCOUNT_NOT_FOUND':
      return 'La cuenta seleccionada no existe.';
    case 'VALIDATION_ERROR':
      return 'Revisá los datos del formulario.';
    default:
      return 'Algo salió mal. Intentá de nuevo.';
  }
}
