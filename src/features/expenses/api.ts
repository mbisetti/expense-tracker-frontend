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
};

export type ExpensesSummary = {
  year: number;
  month: number;
  byCurrency: CurrencyExpenses[];
};
