export type AccountType = 'CASH' | 'DEBIT' | 'CREDIT';

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  balance: number;
  createdAt: string;
};
