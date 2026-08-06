export type CurrencyOverview = {
  currency: string;
  totalBalance: number;
  monthIncome: number;
  monthExpense: number;
  formalBalance: number;
  informalBalance: number;
};

export type ConsolidatedBalance = {
  amount: number;
  currency: string;
  isEstimate: boolean;
  partial: boolean;
};

export type OverviewResponse = {
  byCurrency: CurrencyOverview[];
  consolidated: ConsolidatedBalance | null;
};

export type MonthlyBucket = {
  /** YYYY-MM */
  month: string;
  income: number;
  expense: number;
};

export type CurrencyMonthly = {
  currency: string;
  /** 6 buckets, ascendente (viejo → nuevo), zero-filled por el backend */
  months: MonthlyBucket[];
};

export type MonthlyResponse = {
  byCurrency: CurrencyMonthly[];
};

// ── Compromisos del mes ─────────────────────────────────────────────────────────────────────
//
// "De lo que entra este mes, ¿cuánto ya tiene dueño?". Junta las cuotas de préstamo (S40) con
// los recurrentes (S24.3) y los mide contra los ingresos esperados (S36). Ninguna pantalla
// contestaba esto: los recurrentes viven en Gastos, los préstamos en Cuentas y el esperado acá.

export type CommitmentItem = {
  kind: 'LOAN' | 'RECURRING';
  id: string;
  name: string;
  amount: number;
  /** "Cuota 3 de 12" en los préstamos; null en los recurrentes. */
  detail: string | null;
};

export type CurrencyCommitments = {
  currency: string;
  committedTotal: number;
  loansTotal: number;
  recurringTotal: number;
  expectedIncome: number;
  /**
   * expectedIncome − committedTotal. **Puede ser negativo** — ese es justo el dato que hace útil
   * al bloque. null cuando no hay ingresos esperados cargados: ahí "queda libre" no significa
   * nada y mostrar el comprometido en negativo sugeriría un rojo que no se sabe si existe.
   */
  freeAmount: number | null;
  items: CommitmentItem[];
};

export type Commitments = {
  month: number;
  year: number;
  byCurrency: CurrencyCommitments[];
};
