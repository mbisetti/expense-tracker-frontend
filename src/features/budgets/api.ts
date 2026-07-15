export type BudgetResponse = {
  id: string;
  categoryId: string;
  limitAmount: number;
  currency: string;
  month: number;
  year: number;
};

export type BudgetProgress = {
  budgetId: string;
  categoryId: string;
  categoryName: string;
  currency: string;
  limitAmount: number;
  spentAmount: number;
  projectedEndOfMonth: number;
  projectedStatus: 'ok' | 'will_exceed';
};

export type BudgetsSummaryResponse = {
  budgets: BudgetProgress[];
};

export type BudgetStatus = 'ok' | 'warning' | 'exceeded';

// Umbrales de UI (spec budgets, revisión 2026-07-13): el backend solo manda los
// dos montos. Gastar exactamente el límite ES excedido — te queda $0.
export function budgetStatus(spent: number, limit: number): BudgetStatus {
  if (spent >= limit) return 'exceeded';
  if (spent >= limit * 0.8) return 'warning';
  return 'ok';
}
