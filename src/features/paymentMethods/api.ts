export type PaymentMethodType = 'CASH' | 'DEBIT' | 'CREDIT' | 'DIGITAL_WALLET' | 'TRANSFER';

export type PaymentMethod = {
  id: string;
  userId: string;
  accountId: string;
  name: string;
  type: PaymentMethodType;
  isDefault: boolean;
  createdAt: string;
};
