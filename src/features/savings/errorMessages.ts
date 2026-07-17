import { ApiError } from '../../lib/http';

export function savingsErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Algo salió mal. Intentá de nuevo.';
  switch (error.code) {
    case 'SAVINGS_GOAL_NOT_FOUND':
      return 'El objetivo no existe o fue borrado.';
    case 'IMMUTABLE_FIELD':
      return 'No se puede cambiar la moneda de un objetivo (borralo y creá uno nuevo).';
    case 'VALIDATION_ERROR':
      return 'Revisá los datos del formulario.';
    default:
      return 'Algo salió mal. Intentá de nuevo.';
  }
}
