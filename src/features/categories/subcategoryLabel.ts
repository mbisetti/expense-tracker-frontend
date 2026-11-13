import type { Category } from './api';

// S51: el único lugar que decide cómo se escribe "categoría › subcategoría". Lo usan la fila de
// Movimientos y la lupa de Gastos, y el bot escribe lo mismo.
export const SUBCATEGORY_SEPARATOR = ' › ';

export function categoryWithSub(
  categoryName: string,
  subcategoryName: string | null | undefined,
): string {
  return subcategoryName ? `${categoryName}${SUBCATEGORY_SEPARATOR}${subcategoryName}` : categoryName;
}

/** El nombre de una subcategoría buscándola en su categoría, o null si no está (o no hay id). */
export function subcategoryName(
  category: Category | undefined,
  subcategoryId: string | null | undefined,
): string | null {
  if (!category || !subcategoryId) return null;
  return category.subcategories?.find((s) => s.id === subcategoryId)?.name ?? null;
}

/** "1 subcategoría" / "4 subcategorías". */
export function subcategoryCount(n: number): string {
  return n === 1 ? '1 subcategoría' : `${n} subcategorías`;
}
