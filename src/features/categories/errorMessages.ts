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
    // S48: el orden mandado no es una permutación exacta de las categorías vivas. Lo único que
    // lo produce es que otra pestaña creó o borró una mientras el modal estaba abierto.
    case 'INVALID_CATEGORY_ORDER':
      return 'Tus categorías cambiaron. Cerrá y volvé a abrir.';
    // S51: subcategorías.
    case 'SUBCATEGORY_NAME_TAKEN':
      return 'Ya hay una subcategoría con ese nombre.';
    case 'SUBCATEGORY_LIMIT_REACHED':
      return 'Llegaste al máximo de 20.';
    case 'SUBCATEGORY_NOT_FOUND':
      return 'Esa subcategoría ya no existe. Cerrá y volvé a abrir.';
    case 'INVALID_SUBCATEGORY_ORDER':
      return 'Tus subcategorías cambiaron. Cerrá y volvé a abrir.';
    case 'VALIDATION_ERROR':
      return 'Revisá los datos del formulario.';
    default:
      return 'Algo salió mal. Intentá de nuevo.';
  }
}
