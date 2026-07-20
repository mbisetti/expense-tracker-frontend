import { describe, expect, it } from 'vitest';
import {
  growers,
  peakStory,
  simulateSavings,
  topNonEssential,
  trimLeadingEmpty,
} from './insights';
import type { CategoryExpense, EssentialMonthBucket } from './api';

function cat(over: Partial<CategoryExpense>): CategoryExpense {
  return {
    categoryId: 'id',
    name: 'Cat',
    color: null,
    isEssential: false,
    amount: 0,
    prevMonthAmount: 0,
    avg3mAmount: 0,
    txCount: 0,
    avg3mCount: 0,
    maxTxAmount: 0,
    ...over,
  };
}

function bucket(month: string, essential: number, nonEssential: number): EssentialMonthBucket {
  return { month, essential, nonEssential };
}

describe('insights', () => {
  describe('topNonEssential', () => {
    it('devuelve los no esenciales (ya ordenados desc) y excluye esenciales', () => {
      const byCategory = [
        cat({ name: 'Ocio', amount: 500, isEssential: false }),
        cat({ name: 'Vivienda', amount: 400, isEssential: true }),
        cat({ name: 'Delivery', amount: 300, isEssential: false }),
      ];
      expect(topNonEssential(byCategory).map((c) => c.name)).toEqual(['Ocio', 'Delivery']);
    });
  });

  describe('growers v2', () => {
    it('clasifica puntual / conductual / crecimiento y ordena por crecimiento absoluto', () => {
      const byCategory = [
        // puntual: una compra ≥ 70% del monto
        cat({ name: 'Electro', amount: 300, avg3mAmount: 100, maxTxAmount: 250, txCount: 2, avg3mCount: 2 }),
        // conductual: 8 − 3 = 5 compras más que el promedio
        cat({ name: 'Delivery', amount: 240, avg3mAmount: 100, maxTxAmount: 40, txCount: 8, avg3mCount: 3 }),
        // crecimiento: ni puntual ni conductual → % (130 vs 100 = +30%)
        cat({ name: 'Cafe', amount: 130, avg3mAmount: 100, maxTxAmount: 20, txCount: 4, avg3mCount: 3.5 }),
      ];
      const result = growers(byCategory, 1000);
      expect(result.map((g) => g.category.name)).toEqual(['Electro', 'Delivery', 'Cafe']);
      expect(result[0].kind).toBe('punctual');
      expect(result[1].kind).toBe('behavioral');
      expect(result[2].kind).toBe('growth');
      if (result[1].kind === 'behavioral') expect(result[1].extraCount).toBe(5);
      if (result[2].kind === 'growth') expect(result[2].growthPct).toBe(30);
    });

    it('piso de base: una categoría con promedio < 5% del gasto promedio no genera insight', () => {
      // avg3m 20 = 2% de avg3mTotal 1000 → excluida aunque haya crecido 25×
      const byCategory = [cat({ name: 'Chica', amount: 500, avg3mAmount: 20, maxTxAmount: 500 })];
      expect(growers(byCategory, 1000)).toEqual([]);
    });

    it('sin crecimiento (< 1.2×) → no aparece', () => {
      const byCategory = [cat({ amount: 105, avg3mAmount: 100, maxTxAmount: 20 })];
      expect(growers(byCategory, 1000)).toEqual([]);
    });
  });

  describe('simulateSavings', () => {
    it('calcula ahorro mensual y anual', () => {
      expect(simulateSavings(1000, 20)).toEqual({ monthly: 200, yearly: 2400 });
    });
  });

  describe('trimLeadingEmpty', () => {
    it('recorta ceros del inicio pero mantiene un cero intermedio', () => {
      const months = [
        bucket('2026-02', 0, 0),
        bucket('2026-03', 0, 0),
        bucket('2026-04', 100, 50),
        bucket('2026-05', 0, 0), // cero intermedio: se mantiene (dejaste de gastar)
        bucket('2026-06', 0, 20),
        bucket('2026-07', 0, 0),
      ];
      expect(trimLeadingEmpty(months).map((m) => m.month)).toEqual([
        '2026-04',
        '2026-05',
        '2026-06',
        '2026-07',
      ]);
    });

    it('todos en cero → deja 1 (el último, honesto)', () => {
      const months = [bucket('2026-06', 0, 0), bucket('2026-07', 0, 0)];
      expect(trimLeadingEmpty(months)).toHaveLength(1);
    });
  });

  describe('peakStory', () => {
    const byCategory = [cat({ name: 'Ocio', amount: 500 })];
    const months = [
      bucket('2026-06', 100, 100),
      bucket('2026-07', 300, 200), // el más alto
    ];

    it('el mes seleccionado es el máximo → cuenta la categoría que lo empujó', () => {
      const story = peakStory(months, byCategory, '2026-07');
      expect(story).toEqual({ topName: 'Ocio', topAmount: 500 });
    });

    it('el mes seleccionado NO es el máximo → null', () => {
      expect(peakStory(months, byCategory, '2026-06')).toBeNull();
    });

    it('menos de 2 meses → null', () => {
      expect(peakStory([bucket('2026-07', 300, 200)], byCategory, '2026-07')).toBeNull();
    });
  });
});
