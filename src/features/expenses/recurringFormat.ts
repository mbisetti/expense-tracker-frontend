// Sprint 24.3: formato legible de los gastos recurrentes (puro, testeable — sin JSX ni fetch).
import type { BadgeStatus } from '../../components/ui/Badge';
import type { RecurringFrequency, RecurringItem, RecurringState, Weekday } from './api';

const WEEKDAY_LABEL: Record<Weekday, string> = {
  MONDAY: 'lunes',
  TUESDAY: 'martes',
  WEDNESDAY: 'miércoles',
  THURSDAY: 'jueves',
  FRIDAY: 'viernes',
  SATURDAY: 'sábados',
  SUNDAY: 'domingos',
};

const MONTH_LABEL = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export function frequencyLabel(freq: RecurringFrequency): string {
  switch (freq) {
    case 'MONTHLY': return 'Mensual';
    case 'BIWEEKLY': return 'Quincenal';
    case 'WEEKLY': return 'Semanal';
    case 'ANNUAL': return 'Anual';
  }
}

export function monthName(month: number | null): string {
  return month != null && month >= 1 && month <= 12 ? MONTH_LABEL[month - 1] : '';
}

// Vencimiento legible según la frecuencia (billingDay ya viene clampeado del server).
export function dueLabel(item: Pick<RecurringItem, 'frequency' | 'billingDay' | 'weekday' | 'dueMonth'>): string {
  switch (item.frequency) {
    case 'MONTHLY':
      return item.billingDay != null ? `día ${item.billingDay}` : '';
    case 'BIWEEKLY':
      return item.billingDay != null ? `día ${item.billingDay} y ${item.billingDay + 15}` : '';
    case 'WEEKLY':
      return item.weekday ? `los ${WEEKDAY_LABEL[item.weekday]}` : '';
    case 'ANNUAL':
      return item.dueMonth != null
        ? `${monthName(item.dueMonth)}${item.billingDay != null ? `, día ${item.billingDay}` : ''}`
        : '';
  }
}

export type StateBadge = { status: BadgeStatus; label: string };

// Estado del item para el mes pedido (el server ya lo resolvió). Nunca color solo (Badge lleva ícono).
export function stateBadge(item: Pick<RecurringItem, 'state' | 'expectedCount' | 'paidCount' | 'dueMonth'>): StateBadge {
  const state: RecurringState = item.state;
  switch (state) {
    case 'PAID':
      return { status: 'ok', label: 'Pagado' };
    case 'PARTIAL':
      return { status: 'warning', label: `Parcial ${item.paidCount}/${item.expectedCount}` };
    case 'PENDING':
      return { status: 'pending', label: 'Pendiente' };
    case 'COMPLETED':
      return { status: 'info', label: 'Completado' };
    case 'NOT_DUE':
      return { status: 'info', label: `Próximo: ${monthName(item.dueMonth)}` };
  }
}

export type FinancingCost = { totalInInstallments: number; diff: number; pct: number };

// Costo del financiamiento DERIVADO (D5): total en cuotas vs contado. null si no hay cuotas o
// no se cargó el precio de contado.
export function financingCost(
  amount: number,
  installmentsTotal: number | null,
  cashPrice: number | null,
): FinancingCost | null {
  if (installmentsTotal == null || cashPrice == null || cashPrice <= 0) return null;
  const totalInInstallments = amount * installmentsTotal;
  const diff = totalInInstallments - cashPrice;
  const pct = Math.round((diff / cashPrice) * 100);
  return { totalInInstallments, diff, pct };
}
