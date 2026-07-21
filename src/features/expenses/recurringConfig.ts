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
  // Sprint 24.4: débito automático. debitAccountId/PaymentMethodId como strings de <select>
  // ('' = sin elegir / "Sin método").
  autoDebit: boolean;
  debitAccountId: string;
  debitPaymentMethodId: string;
};

export const emptyRecurringConfig: RecurringConfig = {
  frequency: 'MONTHLY',
  billingDay: '',
  weekday: '',
  dueMonth: '',
  inInstallments: false,
  installmentsTotal: '',
  cashPrice: '',
  autoDebit: false,
  debitAccountId: '',
  debitPaymentMethodId: '',
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
    autoDebit: r.autoDebit,
    debitAccountId: r.debitAccountId ?? '',
    debitPaymentMethodId: r.debitPaymentMethodId ?? '',
  };
}

// Payload de débito automático para el mutation (S24.4). Cuando autoDebit está prendido, el
// backend exige debitAccountId; debitPaymentMethodId vacío = "Sin método" (se omite → null). En el
// PATCH `autoDebit` es autoritativo (apagar = mandar false y basta).
export function buildAutoDebitPayload(c: RecurringConfig): {
  autoDebit: boolean;
  debitAccountId?: string;
  debitPaymentMethodId?: string;
} {
  if (!c.autoDebit) return { autoDebit: false };
  return {
    autoDebit: true,
    debitAccountId: c.debitAccountId || undefined,
    debitPaymentMethodId: c.debitPaymentMethodId || undefined,
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
