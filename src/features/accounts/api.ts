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
  // S40 (D7): cuenta que creó la APP, no el usuario. Hoy sólo 'FRIEND_DEBTS' ("Deudas con
  // amigos"). La marca manda, no el nombre: el usuario puede renombrarla y la card la sigue
  // reconociendo. null/ausente = cuenta normal.
  systemRole?: SystemAccountRole | null;
};

export type SystemAccountRole = 'FRIEND_DEBTS';

// Sprint 27: un renglón de deuda del resumen. Una tarjeta acumula una deuda POR MONEDA — las
// compras en pesos y las compras en dólares cierran y vencen juntas, pero se pagan por separado.
// Todo acá es por moneda; las fechas y `closed` son del ciclo y viven en Statement.
export type StatementLine = {
  currency: string;
  totalSpent: number;
  payments: number;
  closingBalance: number;
  // Sprint 22.3/22.4, ahora por renglón: esta deuda tiene una marca viva.
  paid: boolean;
  // La marca es un PAGO REAL (tiene transfer) vs cosmética → decide si el deshacer confirma.
  paidWithTransfer: boolean;
  // Lo que falta pagar DE ESTA MONEDA (deuda al cierre − pagos posteriores, piso 0).
  remainingToPay: number;
};

export type Statement = {
  accountId: string;
  offset: number;
  statementCloseDay: number;
  paymentDueDay: number;
  /** Moneda PRINCIPAL de la tarjeta — ya no "la del resumen" (eso es line.currency). */
  currency: string;
  /** YYYY-MM-DD */
  periodStart: string;
  /** YYYY-MM-DD */
  periodEnd: string;
  /** YYYY-MM-DD */
  dueDate: string;
  // Sprint 22.4: el ciclo ya cerró (lo decide el server). Solo un ciclo cerrado se paga/marca,
  // y vale para TODOS los renglones: las dos deudas cierran el mismo día.
  closed: boolean;
  // Sprint 27: un renglón por moneda con movimientos (o con saldo abierto). Puede venir vacío.
  lines: StatementLine[];
};
