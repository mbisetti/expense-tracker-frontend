// S36 (D7): SEMIANNUAL y ANNUAL llegaron para fuentes genuinamente anuales (dividendos, un bono
// de otra empresa). NO son el aguinaldo colgado del sueldo — una fuente tiene una sola frecuencia.
export type IncomeFrequency = 'MONTHLY' | 'BIWEEKLY' | 'WEEKLY' | 'SEMIANNUAL' | 'ANNUAL';

/** S36 (EC-4): las frecuencias de más de un mes necesitan un mes ancla. */
export function needsDueMonth(frequency: IncomeFrequency): boolean {
  return frequency === 'SEMIANNUAL' || frequency === 'ANNUAL';
}

export type IncomeSourceResponse = {
  id: string;
  name: string;
  currency: string;
  active: boolean;
  frequency: IncomeFrequency | null;
  /** S36 (D8): monto POR COBRO. El total del mes es monto × ocurrencias. */
  expectedAmount: number | null;
  billingDay: number | null;
  /** S36: mes ancla [1-12], sólo en SEMIANNUAL/ANNUAL. */
  dueMonth: number | null;
  createdAt: string;
};

export type DeductionType = 'PERCENTAGE' | 'FIXED';

export type IncomeDeductionResponse = {
  id: string;
  incomeSourceId: string;
  name: string;
  type: DeductionType;
  value: number;
  active: boolean;
  createdAt: string;
};

export type AppliedDeduction = {
  name: string;
  type: DeductionType;
  value: number;
  appliedAmount: number;
};

export type IncomeEntryListItem = {
  id: string;
  incomeSourceId: string;
  sourceName: string;
  accountId: string;
  grossAmount: number;
  deductions: AppliedDeduction[];
  calculatedNetAmount: number;
  netAmount: number;
  netOverridden: boolean;
  currency: string;
  /** YYYY-MM-DD */
  date: string;
  notes: string | null;
  /** S36 (D5): "Aguinaldo 1/2", "Bono performance Q3". Lo que hace reconocible a un extra. */
  concept: string | null;
  transactionId: string | null;
  createdAt: string;
};

export type IncomeEntryResponse = IncomeEntryListItem & {
  accountBalance: number;
};

export type ExpectedIncomeByCurrency = {
  currency: string;
  expectedTotal: number;
  pendingTotal: number;
  pendingCount: number;
};

// S36 (FR-5): `received` (booleano) se partió en dos contadores. Una quincenal espera DOS cobros:
// con el booleano, cargar el primero la marcaba entera como recibida (BUG-1).
export type ExpectedIncomeSource = {
  sourceId: string;
  name: string;
  currency: string;
  expectedAmount: number;
  billingDay: number;
  dueMonth: number | null;
  frequency: IncomeFrequency;
  expectedCount: number;
  /** Puede superar a expectedCount: un extra cargado a mano no rompe el conteo. */
  receivedCount: number;
  /** La última entry del mes de esta fuente — es lo que borra el destick (FR-2). */
  lastEntryId: string | null;
};

export type ExpectedIncomeResponse = {
  month: number;
  year: number;
  byCurrency: ExpectedIncomeByCurrency[];
  sources: ExpectedIncomeSource[];
};
