export type CurrencyOverview = {
  currency: string;
  totalBalance: number;
  monthIncome: number;
  monthExpense: number;
};

export type OverviewResponse = {
  byCurrency: CurrencyOverview[];
};
