import type { TransactionType } from '../features/transactions/api';

export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount);
}

export function amountSign(type: TransactionType): string {
  return type === 'INCOME' ? '+' : '−';
}

export function amountToneClass(type: TransactionType): string {
  return type === 'INCOME' ? 'text-income' : 'text-expense';
}
