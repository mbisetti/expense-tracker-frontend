export type TransferListItem = {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  fee: number | null;
  exchangeRate: number | null;
  /** YYYY-MM-DD */
  date: string;
  description: string | null;
  fromTransactionId: string;
  toTransactionId: string;
  createdAt: string;
};

export type TransferResponse = TransferListItem & {
  fromAccountBalance: number;
  toAccountBalance: number;
};
