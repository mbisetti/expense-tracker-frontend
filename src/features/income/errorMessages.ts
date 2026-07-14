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
    case 'INCOME_DEDUCTION_NOT_FOUND':
      return 'La deducción no existe o fue borrada.';
    case 'DEDUCTIONS_EXCEED_GROSS':
      return 'Las deducciones superan el bruto: el neto no sería positivo.';
    case 'INVALID_NET_OVERRIDE':
      return 'El neto manual debe ser mayor a 0 y no superar el bruto.';
    case 'INVALID_DEDUCTION_VALUE':
      return 'Un porcentaje no puede superar 100.';
    case 'VALIDATION_ERROR':
      return 'Revisá los datos del formulario.';
    default:
      return 'Algo salió mal. Intentá de nuevo.';
  }
}
