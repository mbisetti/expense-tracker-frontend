import { describe, expect, it } from 'vitest';
import { dueLabel, financingCost, frequencyLabel, monthName, stateBadge } from './recurringFormat';

describe('recurringFormat', () => {
  it('frequencyLabel', () => {
    expect(frequencyLabel('MONTHLY')).toBe('Mensual');
    expect(frequencyLabel('BIWEEKLY')).toBe('Quincenal');
    expect(frequencyLabel('WEEKLY')).toBe('Semanal');
    expect(frequencyLabel('ANNUAL')).toBe('Anual');
  });

  it('monthName', () => {
    expect(monthName(3)).toBe('marzo');
    expect(monthName(null)).toBe('');
    expect(monthName(13)).toBe('');
  });

  it('dueLabel por frecuencia', () => {
    expect(dueLabel({ frequency: 'MONTHLY', billingDay: 15, weekday: null, dueMonth: null })).toBe('día 15');
    expect(dueLabel({ frequency: 'BIWEEKLY', billingDay: 3, weekday: null, dueMonth: null })).toBe('día 3 y 18');
    expect(dueLabel({ frequency: 'WEEKLY', billingDay: null, weekday: 'MONDAY', dueMonth: null })).toBe('los lunes');
    expect(dueLabel({ frequency: 'ANNUAL', billingDay: 10, weekday: null, dueMonth: 3 })).toBe('marzo, día 10');
  });

  it('stateBadge', () => {
    expect(stateBadge({ state: 'PAID', expectedCount: 1, paidCount: 1, dueMonth: null })).toEqual({ status: 'ok', label: 'Pagado' });
    expect(stateBadge({ state: 'PARTIAL', expectedCount: 2, paidCount: 1, dueMonth: null })).toEqual({ status: 'warning', label: 'Parcial 1/2' });
    expect(stateBadge({ state: 'PENDING', expectedCount: 1, paidCount: 0, dueMonth: null })).toEqual({ status: 'pending', label: 'Pendiente' });
    expect(stateBadge({ state: 'COMPLETED', expectedCount: 0, paidCount: 3, dueMonth: null })).toEqual({ status: 'info', label: 'Completado' });
    expect(stateBadge({ state: 'NOT_DUE', expectedCount: 0, paidCount: 0, dueMonth: 3 })).toEqual({ status: 'info', label: 'Próximo: marzo' });
  });

  it('financingCost: total en cuotas vs contado', () => {
    expect(financingCost(1000, 12, 10000)).toEqual({ totalInInstallments: 12000, diff: 2000, pct: 20 });
    // sin cuotas o sin contado → null
    expect(financingCost(1000, null, 10000)).toBeNull();
    expect(financingCost(1000, 12, null)).toBeNull();
  });
});
