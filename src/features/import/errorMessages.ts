import { ApiError } from '../../lib/http';

// Solo errores request-level (§6): los issues POR FILA vienen del server ya en es-AR y el
// preview los muestra tal cual — acá no se re-traducen.
export function importErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'No pudimos procesar el archivo. Intentá de nuevo.';
  }
  switch (error.code) {
    case 'INVALID_FILE':
      // El server manda el detalle accionable (qué hoja/fila falta) — se muestra tal cual.
      return error.message || 'El archivo no es una planilla válida.';
    case 'TOO_MANY_ROWS':
      return 'El archivo tiene demasiadas filas (máximo 500 por import).';
    case 'FILE_TOO_LARGE':
      // El server valida el tope por endpoint desde S37 y lo dice en el mensaje.
      return error.message || 'El archivo supera el límite de 2MB.';
    case 'MISSING_FILE':
      return 'No llegó ningún archivo. Intentá de nuevo.';
    case 'IMPORT_HAS_ERRORS':
      return 'El archivo tiene filas con errores: no se importó nada. Revisá el detalle.';
    case 'BATCH_ALREADY_UNDONE':
      return 'Ese import ya estaba deshecho.';
    case 'IMPORT_BATCH_NOT_FOUND':
      return 'No encontramos ese import.';
    default:
      return 'No pudimos procesar el archivo. Intentá de nuevo.';
  }
}

// S37 — errores de los lectores de PDF (§6). Mismo criterio: el server manda el detalle
// accionable en es-AR y acá sólo se cubre lo que necesita un texto propio.
export function statementErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'No pudimos leer el PDF. Intentá de nuevo.';
  }
  switch (error.code) {
    case 'SCANNED_PDF':
    case 'PDF_PASSWORD_REQUIRED':
    case 'PDF_PASSWORD_INVALID':
    case 'UNRECOGNIZED_STATEMENT':
    case 'STATEMENT_TOTALS_MISMATCH':
    case 'LLM_UNAVAILABLE':
    case 'INVALID_PDF':
    case 'TOO_MANY_PAGES':
    case 'FILE_TOO_LARGE':
      return error.message || 'No pudimos leer el PDF. Intentá de nuevo.';
    case 'MISSING_FILE':
      return 'No llegó ningún archivo. Intentá de nuevo.';
    case 'ACCOUNT_NOT_FOUND':
      return 'No encontramos esa cuenta.';
    default:
      return importErrorMessage(error);
  }
}
