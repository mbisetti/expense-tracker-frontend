import { describe, expect, it } from 'vitest';
import { growers, simulateSavings, topNonEssential } from './insights';
import type { CategoryExpense } from './api';

function cat(over: Partial<CategoryExpense>): CategoryExpense {
  return {
    categoryId: 'id',
    name: 'Cat',
    color: null,
    isEssential: false,
    amount: 0,
    prevMonthAmount: 0,
    avg3mAmount: 0,
    ...over,
  };
}

describe('insights', () => {
  describe('topNonEssential', () => {
    it('devuelve los no esenciales (ya ordenados desc) y excluye esenciales', () => {
      const byCategory = [
        cat({ name: 'Ocio', amount: 500, isEssential: false }),
        cat({ name: 'Vivienda', amount: 400, isEssential: true }),
        cat({ name: 'Delivery', amount: 300, isEssential: false }),
      ];
      const top = topNonEssential(byCategory);
      expect(top.map((c) => c.name)).toEqual(['Ocio', 'Delivery']);
    });

    it('respeta el límite', () => {
      const byCategory = [1, 2, 3, 4].map((n) =>
        cat({ name: `C${n}`, amount: 100 - n, isEssential: false }),
      );
      expect(topNonEssential(byCategory, 2)).toHaveLength(2);
    });
  });

  describe('growers', () => {
    it('solo con avg3m > 0 y amount ≥ 1.2× promedio, ordenados por crecimiento absoluto', () => {
      const byCategory = [
        cat({ name: 'Justo', amount: 120, avg3mAmount: 100 }), // 1.2× exacto → entra (+20)
        cat({ name: 'Salto', amount: 300, avg3mAmount: 100 }), // 3× → entra (+200)
        cat({ name: 'Estable', amount: 105, avg3mAmount: 100 }), // 1.05× → NO
        cat({ name: 'SinBase', amount: 50, avg3mAmount: 0 }), // sin base → NO
      ];
      const result = growers(byCategory);
      expect(result.map((g) => g.category.name)).toEqual(['Salto', 'Justo']);
      expect(result[0].growthPct).toBe(200);
      expect(result[1].growthAbs).toBe(20);
    });

    it('sin base (todo avg3m en 0) → lista vacía', () => {
      const byCategory = [cat({ amount: 500, avg3mAmount: 0 })];
      expect(growers(byCategory)).toEqual([]);
    });
  });

  describe('simulateSavings', () => {
    it('calcula ahorro mensual y anual', () => {
      expect(simulateSavings(1000, 20)).toEqual({ monthly: 200, yearly: 2400 });
    });

    it('nonEssential 0 → ahorro 0', () => {
      expect(simulateSavings(0, 30)).toEqual({ monthly: 0, yearly: 0 });
    });
  });
});
