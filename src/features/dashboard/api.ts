export type CurrencyOverview = {
  currency: string;
  totalBalance: number;
  monthIncome: number;
  monthExpense: number;
};

export type ConsolidatedBalance = {
  amount: number;
  currency: string;
  isEstimate: boolean;
  partial: boolean;
};

export type OverviewResponse = {
  byCurrency: CurrencyOverview[];
  consolidated: ConsolidatedBalance | null;
};

export type MonthlyBucket = {
  /** YYYY-MM */
  month: string;
  income: number;
  expense: number;
};

export type CurrencyMonthly = {
  currency: string;
  /** 6 buckets, ascendente (viejo → nuevo), zero-filled por el backend */
  months: MonthlyBucket[];
};

export type MonthlyResponse = {
  byCurrency: CurrencyMonthly[];
};
