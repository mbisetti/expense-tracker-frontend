import type { CategoryExpense, EssentialMonthBucket } from './api';

// Sprint 24 (D8) + S24.2 (E): helpers puros para los insights de "dónde recortar". Sin estado
// ni fetch — operan sobre la respuesta del endpoint. Unit-testeables.

// Umbrales heurísticos, calibrables por Marko con datos reales (S24.2 §9.9).
export const INSIGHT_THRESHOLDS = {
  growth: 1.2, // gasto ≥ 1.2× el promedio 3m → "creció"
  baseFloor: 0.05, // el promedio de la categoría ≥ 5% del gasto promedio (mata los %-con-base-chica)
  punctualRatio: 0.7, // una sola compra ≥ 70% del gasto del mes → compra puntual
  extraTx: 2, // ≥ 2 compras más que el promedio → conductual
};

// S24.2 (C.2): recorta los buckets vacíos SOLO del inicio de la ventana. Un mes en cero ENTRE
// meses con data es historia real (dejaste de gastar) y se mantiene. Nunca deja la ventana
// vacía: si todos son cero, devuelve el último (1 mes, honesto).
export function trimLeadingEmpty(months: EssentialMonthBucket[]): EssentialMonthBucket[] {
  let start = 0;
  while (start < months.length - 1 && months[start].essential + months[start].nonEssential === 0) {
    start++;
  }
  return months.slice(start);
}

// Top N no esenciales por monto del mes. byCategory ya viene ordenado DESC del backend, así
// que filtrar preserva el orden. "Sin categoría" (isEssential=false) cuenta como no esencial.
export function topNonEssential(byCategory: CategoryExpense[], limit = 3): CategoryExpense[] {
  return byCategory.filter((c) => !c.isEssential).slice(0, limit);
}

// S24.2 (E): un grower clasificado. La UI muestra copy distinto por `kind`.
export type Grower =
  | { category: CategoryExpense; growthAbs: number; kind: 'punctual'; maxTxAmount: number }
  | { category: CategoryExpense; growthAbs: number; kind: 'behavioral'; extraCount: number }
  | { category: CategoryExpense; growthAbs: number; kind: 'growth'; growthPct: number };

// Categorías que se dispararon: promedio 3m > 0, gasto ≥ 1.2× el promedio, Y el promedio ≥ 5%
// del gasto promedio total (piso anti-%-gigante). Orden por crecimiento ABSOLUTO desc, top N.
// Cada una se clasifica por prioridad: compra puntual → conductual → % de crecimiento.
export function growers(
  byCategory: CategoryExpense[],
  avg3mTotal: number,
  limit = 3,
): Grower[] {
  const floor = INSIGHT_THRESHOLDS.baseFloor * avg3mTotal;
  return byCategory
    .filter(
      (c) =>
        c.avg3mAmount > 0 &&
        c.amount >= INSIGHT_THRESHOLDS.growth * c.avg3mAmount &&
        c.avg3mAmount >= floor,
    )
    .map((c): Grower => {
      const growthAbs = c.amount - c.avg3mAmount;
      if (c.maxTxAmount >= INSIGHT_THRESHOLDS.punctualRatio * c.amount) {
        return { category: c, growthAbs, kind: 'punctual', maxTxAmount: c.maxTxAmount };
      }
      if (c.txCount - c.avg3mCount >= INSIGHT_THRESHOLDS.extraTx) {
        return {
          category: c,
          growthAbs,
          kind: 'behavioral',
          extraCount: Math.round(c.txCount - c.avg3mCount),
        };
      }
      return {
        category: c,
        growthAbs,
        kind: 'growth',
        growthPct: Math.round((growthAbs / c.avg3mAmount) * 100),
      };
    })
    .sort((a, b) => b.growthAbs - a.growthAbs)
    .slice(0, limit);
}

export type PeakStory = { topName: string | null; topAmount: number } | null;

// Historia del pico: si el mes seleccionado es el MÁXIMO de la ventana visible (post-trim) y
// hay ≥2 meses para comparar, lo cuenta con la categoría que lo empujó (top del mes). Solo
// aplica al mes seleccionado (no tenemos el breakdown de OTROS meses client-side).
export function peakStory(
  months: EssentialMonthBucket[],
  byCategory: CategoryExpense[],
  selectedMonth: string,
): PeakStory {
  if (months.length < 2) return null;
  const totalOf = (m: EssentialMonthBucket) => m.essential + m.nonEssential;
  const selected = months.find((m) => m.month === selectedMonth);
  if (!selected) return null;
  const maxTotal = Math.max(...months.map(totalOf));
  if (maxTotal === 0 || totalOf(selected) < maxTotal) return null;
  const top = byCategory[0]; // ya viene ordenado DESC por monto
  if (!top) return null;
  return { topName: top.name, topAmount: top.amount };
}

// Simulador: recortar `pct`% de lo no esencial → ahorro mensual y anual (×12).
export function simulateSavings(
  nonEssentialTotal: number,
  pct: number,
): { monthly: number; yearly: number } {
  const monthly = (nonEssentialTotal * pct) / 100;
  return { monthly, yearly: monthly * 12 };
}
