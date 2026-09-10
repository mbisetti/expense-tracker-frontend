import type { ArsQuote } from '../../lib/quoteLabel';

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
  /** S49: qué dólar se usó, cuando el par es USD/ARS. null = salió del proveedor de siempre y la
   *  pantalla muestra el copy de antes de S49. No es un error. */
  quote: ArsQuote | null;
  /** S49: de qué día es esa cotización, "YYYY-MM-DD". */
  quoteDate: string | null;
};
