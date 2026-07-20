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
  byCategory: CategoryExpense[];
  months: EssentialMonthBucket[];
};

export type ExpensesSummary = {
  year: number;
  month: number;
  byCurrency: CurrencyExpenses[];
};
