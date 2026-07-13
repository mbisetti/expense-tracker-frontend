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
};

export type BudgetsSummaryResponse = {
  budgets: BudgetProgress[];
};

export type BudgetStatus = 'ok' | 'warning' | 'exceeded';

// Umbrales de UI (spec budgets FR-5): el backend solo manda los dos montos
export function budgetStatus(spent: number, limit: number): BudgetStatus {
  if (spent > limit) return 'exceeded';
  if (spent >= limit * 0.8) return 'warning';
  return 'ok';
}
