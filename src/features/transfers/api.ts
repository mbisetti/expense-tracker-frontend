export type TransferListItem = {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  fromAmount: number;
  toAmount: number;
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

export type ExchangeRateResult = {
  base: string;
  target: string;
  rate: number | null;
  asOf: string | null;
  unavailable: boolean;
};
