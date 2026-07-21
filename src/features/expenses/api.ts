// Sprint 24 (tab Gastos): espejo de los DTOs de summary/expenses. Multimoneda por tabs,
// sin conversión: cada moneda con su análisis completo.

export type CategoryExpense = {
  // null = bucket "Sin categoría" (el front lo rotula).
  categoryId: string | null;
  name: string | null;
  color: string | null;
  isEssential: boolean;
  amount: number;
  prevMonthAmount: number;
  avg3mAmount: number;
  // Sprint 24.2 (insights v2): datos del mes pedido para clasificar los growers.
  txCount: number;
  avg3mCount: number;
  maxTxAmount: number;
};

export type EssentialMonthBucket = {
  /** YYYY-MM */
  month: string;
  essential: number;
  nonEssential: number;
};

// ── Sprint 24.3: gastos recurrentes ──────────────────────────────────────────

export type RecurringFrequency = 'MONTHLY' | 'BIWEEKLY' | 'WEEKLY' | 'ANNUAL';
export type Weekday =
  | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
export type RecurringState = 'COMPLETED' | 'NOT_DUE' | 'PAID' | 'PARTIAL' | 'PENDING';

// CRUD (GET /recurring-expenses): la DEFINICIÓN, con el billingDay CRUDO 1-31 (para editar).
export type RecurringExpense = {
  id: string;
  name: string;
  amount: number;
  currency: string;
  categoryId: string;
  frequency: RecurringFrequency;
  billingDay: number | null;
  weekday: Weekday | null;
  dueMonth: number | null;
  installmentsTotal: number | null;
  cashPrice: number | null;
  // Sprint 24.4: débito automático. autoDebit true → el runner genera la tx sola desde
  // debitAccountId (null = cuenta borrada → cartel). debitPaymentMethodId opcional.
  autoDebit: boolean;
  debitAccountId: string | null;
  debitPaymentMethodId: string | null;
  active: boolean;
  createdAt: string;
};

// Un recurrente visto DESDE el mes pedido (viene en el summary). billingDay ya clampeado (D7).
export type RecurringItem = {
  id: string;
  name: string;
  amount: number;
  frequency: RecurringFrequency;
  billingDay: number | null;
  weekday: Weekday | null;
  dueMonth: number | null;
  state: RecurringState;
  expectedCount: number;
  paidCount: number;
  installmentsPaid: number;
  installmentsTotal: number | null;
  cashPrice: number | null;
  isEssential: boolean;
  categoryId: string | null;
  categoryName: string | null;
  // Sprint 24.4: autoDebit pinta el sufijo "· Auto"; debitAccountId null con autoDebit = cuenta
  // borrada → cartel; failedCount = débitos del mes fallidos por saldo → badge "Sin saldo".
  autoDebit: boolean;
  debitAccountId: string | null;
  failedCount: number;
};

export type RecurringSummary = {
  committedTotal: number;
  paidTotal: number;
  pendingTotal: number;
  nonEssentialCommittedTotal: number;
  items: RecurringItem[];
};

export type CurrencyExpenses = {
  currency: string;
  total: number;
  essentialTotal: number;
  nonEssentialTotal: number;
  prevMonthTotal: number;
  avg3mTotal: number;
  // Sprint 24.2 (E): proyección MTD — solo cuando el mes pedido == mes corriente (si no, null).
  totalToDate: number | null;
  projectedTotal: number | null;
  byCategory: CategoryExpense[];
  months: EssentialMonthBucket[];
  // Sprint 24.3: bloque de gastos recurrentes de esta moneda (opcional por compat de fixtures;
  // el backend siempre lo manda).
  recurring?: RecurringSummary;
};

export type ExpensesSummary = {
  year: number;
  month: number;
  byCurrency: CurrencyExpenses[];
};
