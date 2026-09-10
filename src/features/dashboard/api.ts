import type { ArsQuote } from '../../lib/quoteLabel';

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
  /** S49: con qué dólar se calculó el "≈". null = no intervino el par USD/ARS (o la tabla de
   *  índices todavía no tiene datos) y el banner muestra el copy de siempre. */
  quote: ArsQuote | null;
  /** S49: de qué día es esa cotización, "YYYY-MM-DD". */
  quoteDate: string | null;
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
  /** S49: si los montos vienen EFECTIVAMENTE en pesos constantes. Pedirlo sin IPC en la tabla
   *  devuelve montos nominales y false, que es lo que deshabilita el switch. */
  constant: boolean;
  /** S49: hasta qué mes llega el IPC publicado, "YYYY-MM". Viene se haya pedido el ajuste o no:
   *  es lo que dice si el switch se puede prender. null = todavía no hay IPC. */
  ipcAsOf: string | null;
  /** S49: cuántos meses de la ventana quedaron nominales porque no hay IPC tan atrás. */
  unadjustedMonths: number;
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
