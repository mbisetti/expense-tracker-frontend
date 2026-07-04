import { ApiError } from '../../lib/http';

export function categoryErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'Algo salió mal. Intentá de nuevo.';
  }
  switch (error.code) {
    case 'CATEGORY_NOT_EDITABLE':
      return 'Las categorías del sistema no se pueden modificar ni borrar.';
    case 'CATEGORY_NOT_FOUND':
      return 'La categoría no existe o fue borrada.';
    case 'VALIDATION_ERROR':
      return 'Revisá los datos del formulario.';
    default:
      return 'Algo salió mal. Intentá de nuevo.';
  }
}
