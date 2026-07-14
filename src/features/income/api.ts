export type IncomeSourceResponse = {
  id: string;
  name: string;
  currency: string;
  active: boolean;
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
  transactionId: string | null;
  createdAt: string;
};

export type IncomeEntryResponse = IncomeEntryListItem & {
  accountBalance: number;
};
