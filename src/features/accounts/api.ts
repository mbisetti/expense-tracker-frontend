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
  /**
   * S42: link al home banking de la cuenta (o al portal donde vive el préstamo). Es un atajo,
   * no una integración: la app no lee nada de ahí.
   *
   * El backend garantiza que sea http(s) — se renderiza como href, así que cualquier otro
   * esquema sería XSS. Igual va con rel="noreferrer" por el opener.
   */
  externalUrl?: string | null;
  // S40 (D7): cuenta que creó la APP, no el usuario. Hoy sólo 'FRIEND_DEBTS' ("Deudas con
  // amigos"). La marca manda, no el nombre: el usuario puede renombrarla y la card la sigue
  // reconociendo. null/ausente = cuenta normal.
  systemRole?: SystemAccountRole | null;
  // S40 (D5): plan de pagos de un préstamo (sólo DEBT) + todo lo derivado. null = sin plan.
  loan?: LoanProgress | null;
};

export type SystemAccountRole = 'FRIEND_DEBTS';

// ── S40 (D5): préstamos ─────────────────────────────────────────────────────────────────────
//
// Ni entidad nueva ni recurrentes: un préstamo es metadata sobre la cuenta DEBT + derivación.
// Nada de lo derivado se guarda — el total es cuota × cantidad y el progreso se mide contra la
// plata efectivamente pagada (por eso no hay que "sembrar" la deuda al configurarlo).
export type LoanProgress = {
  installmentAmount: number;
  installmentsTotal: number;
  dueDay: number;
  startedOn: string;
  /** Lo que te dieron. Opcional: sólo sirve para mostrar el costo. */
  principal: number | null;
  /** cuota × cantidad — lo que vas a devolver, intereses incluidos. */
  totalAmount: number;
  paidAmount: number;
  paidInstallments: number;
  /** null si el préstamo está completo. */
  nextDueDate: string | null;
  completed: boolean;
  /** total − principal. null si no cargaste el principal. NO es una tasa. */
  cost: number | null;
  costPct: number | null;
  // Tasa efectiva derivada del capital y del flujo de cuotas (TIR). null sin capital cargado.
  // Responde otra pregunta que `costPct`: no cuánto de más devolvés, sino a qué tasa te prestaron.
  monthlyRatePct: number | null;
  /** Anual EFECTIVA (capitaliza mes a mes). El contrato suele publicar la TNA, que da menor. */
  annualRatePct: number | null;
};

/** Los 4 campos del plan son atómicos: o los cuatro o ninguno (el server responde 400). */
export type LoanInput = {
  loanInstallmentAmount?: number | null;
  loanInstallmentsTotal?: number | null;
  loanDueDay?: number | null;
  loanStartedOn?: string | null;
  loanPrincipal?: number | null;
};

// ── S40 (D1/D3): rendimiento de una inversión ───────────────────────────────────────────────
//
// La frontera aporte/rendimiento es `transfer_id` y ya existía: mover plata tuya no es ganar.
// Se mira en MESES y nunca en uno solo (pedido de Marko: un mes malo desinforma y deprime).

export type PerformanceMonth = {
  /** "YYYY-MM" */
  month: string;
  contributions: number;
  withdrawals: number;
  yield: number;
  startingBalance: number;
};

export type PerformanceProjection = {
  horizonMonths: number;
  projectedBalance: number;
  monthlyRatePct: number;
  monthsWithBase: number;
};

export type CurrencyPerformance = {
  currency: string;
  windowYield: number;
  windowMonths: number;
  totalYield: number;
  initialContribution: { amount: number; date: string } | null;
  totalContributed: number;
  totalWithdrawn: number;
  currentBalance: number;
  /** null con menos de 3 meses con base: proyectar sobre dos puntos es inventar. */
  projection: PerformanceProjection | null;
  series: PerformanceMonth[];
};

export type AccountPerformance = {
  accountId: string;
  currencies: CurrencyPerformance[];
};

/** El usuario dice cuánto vale HOY; la diferencia la calcula el server. */
export type AdjustValueInput = {
  currency?: string;
  currentValue: number;
};

/** D10: CRYPTO es INVESTMENT en todo lo nuevo — un solo predicado, un solo camino. */
export function isInvestmentAccount(type: AccountType): boolean {
  return type === 'INVESTMENT' || type === 'CRYPTO';
}

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
