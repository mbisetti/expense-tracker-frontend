import { ApiError } from '../../lib/http';

export function budgetErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Algo salió mal. Intentá de nuevo.';
  switch (error.code) {
    case 'BUDGET_ALREADY_EXISTS':
    case 'DUPLICATE_BUDGET':
      return 'Ya tenés un presupuesto para esa categoría este mes.';
    case 'CATEGORY_NOT_FOUND':
      return 'La categoría no existe.';
    case 'IMMUTABLE_FIELD':
      return 'De un presupuesto sólo se puede cambiar el límite.';
    case 'BUDGET_NOT_FOUND':
      return 'El presupuesto no existe o fue borrado.';
    case 'VALIDATION_ERROR':
      return 'Revisá los datos del formulario.';
    default:
      return 'Algo salió mal. Intentá de nuevo.';
  }
}
