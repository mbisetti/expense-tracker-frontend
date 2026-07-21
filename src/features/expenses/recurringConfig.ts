// Sprint 24.3: estado (como strings de input) de la configuración por frecuencia de un gasto
// recurrente + helpers puros. Separado del componente RecurringConfigFields por la regla
// react-refresh (un archivo de componente solo exporta componentes).
import { numberToAmountDisplay, parseAmountInput } from '../../lib/money';
import type { RecurringExpense, RecurringFrequency, Weekday } from './api';

export type RecurringConfig = {
  frequency: RecurringFrequency;
  billingDay: string;
  weekday: Weekday | '';
  dueMonth: string;
  inInstallments: boolean;
  installmentsTotal: string;
  cashPrice: string;
};

export const emptyRecurringConfig: RecurringConfig = {
  frequency: 'MONTHLY',
  billingDay: '',
  weekday: '',
  dueMonth: '',
  inInstallments: false,
  installmentsTotal: '',
  cashPrice: '',
};

export function configFromRecurring(r: RecurringExpense): RecurringConfig {
  return {
    frequency: r.frequency,
    billingDay: r.billingDay != null ? String(r.billingDay) : '',
    weekday: r.weekday ?? '',
    dueMonth: r.dueMonth != null ? String(r.dueMonth) : '',
    inInstallments: r.installmentsTotal != null,
    installmentsTotal: r.installmentsTotal != null ? String(r.installmentsTotal) : '',
    cashPrice: r.cashPrice != null ? numberToAmountDisplay(r.cashPrice) : '',
  };
}

function numOrUndef(s: string): number | undefined {
  const n = Number(s);
  return s.trim() !== '' && Number.isFinite(n) ? n : undefined;
}

// Payload de config para el mutation (solo los campos de la frecuencia elegida). El backend
// revalida (INVALID_RECURRING_CONFIG); esto solo evita mandar campos de otra frecuencia.
export function buildConfigPayload(c: RecurringConfig): {
  billingDay?: number;
  weekday?: Weekday;
  dueMonth?: number;
  installmentsTotal?: number;
  cashPrice?: number;
} {
  const showInstallments = c.frequency === 'MONTHLY';
  return {
    billingDay: c.frequency === 'WEEKLY' ? undefined : numOrUndef(c.billingDay),
    weekday: c.frequency === 'WEEKLY' ? (c.weekday || undefined) : undefined,
    dueMonth: c.frequency === 'ANNUAL' ? numOrUndef(c.dueMonth) : undefined,
    installmentsTotal: showInstallments && c.inInstallments ? numOrUndef(c.installmentsTotal) : undefined,
    cashPrice: showInstallments && c.inInstallments ? (parseAmountInput(c.cashPrice) || undefined) : undefined,
  };
}
