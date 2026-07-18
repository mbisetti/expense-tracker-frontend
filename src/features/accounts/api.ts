// Sprint 22.2: tipos "vehículo". Activos: CASH·BANK·WALLET·INVESTMENT·CRYPTO. Pasivos:
// CREDIT (línea con ciclo) · DEBT (préstamo/fiado, pasivo pelado). DEBIT se renombró a BANK.
export type AccountType = 'CASH' | 'BANK' | 'WALLET' | 'INVESTMENT' | 'CRYPTO' | 'CREDIT' | 'DEBT';

// Sub-balance de la cuenta en una moneda (Sprint 22, cuentas mixtas).
export type CurrencyBalance = {
  currency: string;
  balance: number;
};

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  /** Moneda principal: default del selector, display primario, moneda de la cuenta vacía. */
  currency: string;
  /** Sub-balance de la principal (== total en cuentas mono-moneda). */
  balance: number;
  isInformal: boolean;
  createdAt: string;
  statementCloseDay: number | null;
  paymentDueDay: number | null;
  // Sprint 22: la principal SIEMPRE y primera (aunque 0); después toda moneda con ≥1 tx viva,
  // orden alfabético. Chips no-principales en 0 se esconden en la UI.
  balances: CurrencyBalance[];
  // Sprint 22.2: agrupación visual "todo mi Santander" (D4) y vínculo tarjeta→madre (D2).
  // Nullable; el backend puede omitirlos → se toleran como null/undefined.
  institution: string | null;
  linkedAccountId: string | null;
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
