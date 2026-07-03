export type TransactionType = 'INCOME' | 'EXPENSE';

export type TransactionListItem = {
  id: string;
  accountId: string;
  categoryId: string | null;
  paymentMethodId: string | null;
  type: TransactionType;
  amount: number;
  currency: string;
  exchangeRateAtTime: number | null;
  date: string;
  description: string | null;
  createdAt: string;
};

export type TransactionResponse = TransactionListItem & {
  accountBalance: number;
};

export type PageResponse<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type TransactionFilters = {
  accountId?: string;
  categoryId?: string;
  paymentMethodId?: string;
  type?: TransactionType;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  size?: number;
  sort?: 'date' | 'amount';
  direction?: 'ASC' | 'DESC';
};

export function buildTransactionsQuery(filters: TransactionFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}
