export type IncomeSourceResponse = {
  id: string;
  name: string;
  currency: string;
  active: boolean;
  createdAt: string;
};

export type IncomeEntryListItem = {
  id: string;
  incomeSourceId: string;
  sourceName: string;
  accountId: string;
  amount: number;
  currency: string;
  /** YYYY-MM-DD */
  date: string;
  notes: string | null;
  transactionId: string | null;
  createdAt: string;
};

export type IncomeEntryResponse = IncomeEntryListItem & {
  accountBalance: number;
};
