import { ApiError } from '../../lib/http';

export function exportErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'No pudimos generar el archivo. Intentá de nuevo.';
  }
  switch (error.code) {
    case 'INVALID_DATE_RANGE':
      return 'La fecha "desde" no puede ser posterior a la "hasta".';
    case 'ACCOUNT_NOT_FOUND':
      return 'La cuenta seleccionada no existe.';
    case 'VALIDATION_ERROR':
      return 'Revisá las fechas del export.';
    default:
      return 'No pudimos generar el archivo. Intentá de nuevo.';
  }
}
