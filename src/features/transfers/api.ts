export type TransferListItem = {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  fromAmount: number;
  toAmount: number;
  // Moneda resuelta de cada pata (Sprint 22): el front ya NO la deriva de las cuentas —
  // con transfers intra-cuenta ambas patas comparten cuenta pero difieren en moneda.
  fromCurrency: string;
  toCurrency: string;
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
