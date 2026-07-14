import { describe, expect, it } from 'vitest';
import { previewNet } from './deductionMath';
import type { IncomeDeductionResponse } from './api';

function ded(type: 'PERCENTAGE' | 'FIXED', value: number): IncomeDeductionResponse {
  return {
    id: crypto.randomUUID(),
    incomeSourceId: 's',
    name: `${type} ${value}`,
    type,
    value,
    active: true,
    createdAt: '2026-01-01T00:00:00',
  };
}

describe('previewNet (espeja el DeductionCalculator del backend)', () => {
  it('sin deducciones: neto == bruto', () => {
    expect(previewNet(1000, []).calculatedNet).toBe(1000);
  });

  it('FIXED resta absoluto', () => {
    expect(previewNet(1000, [ded('FIXED', 100)]).calculatedNet).toBe(900);
  });

  it('PERCENTAGE sobre el bruto', () => {
    expect(previewNet(1000, [ded('PERCENTAGE', 10)]).calculatedNet).toBe(900);
  });

  it('el borde del sprint: 33.33% de 100.01 + FIXED 10 → 56.68', () => {
    const r = previewNet(100.01, [ded('PERCENTAGE', 33.33), ded('FIXED', 10)]);
    expect(r.lines[0].appliedAmount).toBe(33.33);
    expect(r.calculatedNet).toBe(56.68);
  });

  it('múltiples porcentajes, todos sobre el bruto (no secuencial)', () => {
    expect(previewNet(1000, [ded('PERCENTAGE', 10), ded('PERCENTAGE', 20)]).calculatedNet).toBe(700);
  });
});
