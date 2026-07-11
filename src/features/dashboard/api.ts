export type CurrencyOverview = {
  currency: string;
  totalBalance: number;
  monthIncome: number;
  monthExpense: number;
};

export type OverviewResponse = {
  byCurrency: CurrencyOverview[];
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
