export type AccountType = 'CASH' | 'DEBIT' | 'CREDIT';

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  balance: number;
  isInformal: boolean;
  createdAt: string;
  statementCloseDay: number | null;
  paymentDueDay: number | null;
};

export type Statement = {
  accountId: string;
  offset: number;
  statementCloseDay: number;
  paymentDueDay: number;
  currency: string;
  /** YYYY-MM-DD */
  periodStart: string;
  /** YYYY-MM-DD */
  periodEnd: string;
  /** YYYY-MM-DD */
  dueDate: string;
  totalSpent: number;
  payments: number;
  closingBalance: number;
};
