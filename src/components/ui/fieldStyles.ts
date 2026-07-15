// Clases compartidas por Input/Select/DateField — no es un componente, es el pegamento
// para que los 3 campos se vean idénticos (mismo alto, radio, foco, estado de error).
// min-h-11 = 44px: cumple el mínimo de touch target (§4) en los tres.
export const FIELD_BASE =
  'w-full min-h-11 rounded-sm border bg-surface-sunken px-3 text-base text-ink placeholder:text-muted transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50';

// Reutiliza el token `expense` (no `exceeded`, que es específico de presupuestos) como
// el "negativo/peligro" genérico de chrome — mismo criterio que Button variant="danger".
export function fieldBorderClass(hasError: boolean): string {
  return hasError
    ? 'border-expense focus-visible:ring-expense'
    : 'border-line focus-visible:ring-brand';
}

export const FIELD_LABEL_CLASS = 'text-sm font-medium text-ink';
export const FIELD_HELPER_CLASS = 'text-xs text-muted';
export const FIELD_ERROR_CLASS = 'flex items-center gap-1 text-xs text-expense';
export const FIELD_WRAPPER_CLASS = 'flex flex-col gap-1.5';
