// Helpers de etiqueta de mes en es-AR, capitalizados. Antes duplicados en PeriodNav y
// CategoryTransactionsModal (largo) y en EssentialTrendChart/MonthlyChart (corto) — S24.2.

// "Julio de 2026" (mes largo + año, primera en mayúscula).
export function periodLabel(year: number, month: number): string {
  const s = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(
    new Date(year, month - 1, 1),
  );
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// "Jul." (mes corto capitalizado) desde un 'YYYY-MM'.
export function monthShortLabel(ym: string): string {
  const [y, m] = ym.split('-');
  const s = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('es-AR', { month: 'short' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
