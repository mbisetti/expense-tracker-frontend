import type { CategoryExpense } from './api';

// Sprint 24 (D8): helpers puros para los insights de "dónde recortar". Sin estado ni fetch —
// operan sobre la respuesta del endpoint. Unit-testeables.

// Top N no esenciales por monto del mes. byCategory ya viene ordenado DESC del backend, así
// que filtrar preserva el orden. "Sin categoría" (isEssential=false) cuenta como no esencial.
export function topNonEssential(byCategory: CategoryExpense[], limit = 3): CategoryExpense[] {
  return byCategory.filter((c) => !c.isEssential).slice(0, limit);
}

export type Grower = {
  category: CategoryExpense;
  /** % por encima del promedio 3m (redondeado). */
  growthPct: number;
  /** crecimiento absoluto sobre el promedio. */
  growthAbs: number;
};

// Categorías que se dispararon: promedio 3m > 0 (base real) Y gasto ≥ 1.2 × promedio (umbral
// del spec). Orden por crecimiento ABSOLUTO desc (un salto grande importa más que un % alto
// sobre una base chica). Top N. Sin base (avg3m todo en 0) → lista vacía.
export function growers(byCategory: CategoryExpense[], limit = 3): Grower[] {
  return byCategory
    .filter((c) => c.avg3mAmount > 0 && c.amount >= 1.2 * c.avg3mAmount)
    .map((c) => ({
      category: c,
      growthAbs: c.amount - c.avg3mAmount,
      growthPct: Math.round(((c.amount - c.avg3mAmount) / c.avg3mAmount) * 100),
    }))
    .sort((a, b) => b.growthAbs - a.growthAbs)
    .slice(0, limit);
}

// Simulador: recortar `pct`% de lo no esencial → ahorro mensual y anual (×12).
export function simulateSavings(
  nonEssentialTotal: number,
  pct: number,
): { monthly: number; yearly: number } {
  const monthly = (nonEssentialTotal * pct) / 100;
  return { monthly, yearly: monthly * 12 };
}
