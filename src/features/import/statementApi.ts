// S37 — lectores de PDF: tipos del contrato con /api/v1/import/statements/*.
// Hermano de api.ts (el import de plantilla de S28), no reemplazo: son dos fuentes distintas
// que comparten el historial de batches y el deshacer.

import type { RowIssue } from './api';

export type StatementSourceKind = 'ACCOUNT_STATEMENT' | 'CARD_STATEMENT';

export type StatementSectionKey =
  | 'MOVEMENTS'
  | 'INSTALLMENTS'
  | 'TAXES'
  | 'YIELDS'
  | 'REVERSALS'
  | 'PAYMENTS';

/** D5: qué hacer con los consumos de un titular. */
export type HolderMode = 'OWN' | 'REIMBURSED' | 'IGNORED';

export type StatementRowResult = {
  id: string;
  section: StatementSectionKey;
  status: 'OK' | 'WARNING' | 'ERROR';
  date: string | null;
  /** D6: fecha de la compra original de una cuota. Sólo para mostrar. */
  originalDate: string | null;
  description: string | null;
  externalRef: string | null;
  amount: number | null;
  currency: string | null;
  type: 'EXPENSE' | 'INCOME' | null;
  categoryId: string | null;
  paymentMethodId: string | null;
  categoryName: string | null;
  /** HISTORY = salió de tus movimientos, LLM = la adivinó el modelo (D13). */
  categorySource: string | null;
  installmentNumber: number | null;
  installmentTotal: number | null;
  holderKey: string | null;
  /** D14: el literal que escribió el banco, cuando el renglón trae un nombre. */
  detectedName: string | null;
  needsPersonLink: boolean;
  personId: string | null;
  personName: string | null;
  settlesShare: boolean;
  ownTransferAccountId: string | null;
  sharedAmount: number | null;
  pairedWithId: string | null;
  /** D9: cuántos movimientos representa una fila colapsada. 1 = ella misma. */
  collapsedCount: number;
  duplicate: boolean;
  selected: boolean;
  issues: RowIssue[];
};

export type DetectedSource = {
  issuer: string | null;
  holderName: string | null;
  accountNumber: string | null;
  cardLast4: string | null;
  statementNumber: string | null;
  periodStart: string | null;
  periodEnd: string | null;
};

/** D4: una moneda y sus cuentas. `expected` es lo que dice el papel. */
export type CurrencyCheck = {
  currency: string;
  label: string;
  expected: number | null;
  computed: number;
  difference: number;
  ok: boolean;
  /** El desvío es del documento, no de la lectura: no bloquea, pero se muestra. */
  documentInconsistency: boolean;
  message: string;
};

export type StatementAmount = { currency: string; amount: number };

export type Holder = {
  key: string;
  name: string;
  cardLast4: string | null;
  totals: StatementAmount[];
  mode: HolderMode;
  personId: string | null;
  rowCount: number;
};

export type CycleUpdate = {
  closeDate: string | null;
  dueDate: string | null;
  nextCloseDate: string | null;
  nextDueDate: string | null;
  currentCloseDay: number | null;
  currentDueDay: number | null;
  proposedCloseDay: number | null;
  proposedDueDay: number | null;
  updatable: boolean;
  note: string | null;
};

export type PendingName = {
  alias: string;
  rawAlias: string;
  suggestedPersonId: string | null;
  suggestedPersonName: string | null;
  rowCount: number;
  totals: StatementAmount[];
};

export type StatementSection = {
  key: StatementSectionKey;
  label: string;
  note: string | null;
  selectedByDefault: boolean;
  rows: StatementRowResult[];
};

export type StatementReport = {
  dryRun: boolean;
  sourceKind: StatementSourceKind;
  summary: string;
  detected: DetectedSource;
  /** MATCH = el archivo es de la cuenta elegida. MISMATCH exige confirmar (D15). */
  accountMatch: 'MATCH' | 'MISMATCH' | 'UNKNOWN';
  accountMatchMessage: string | null;
  checks: CurrencyCheck[];
  checksPass: boolean;
  holders: Holder[];
  cycle: CycleUpdate | null;
  pendingNames: PendingName[];
  directDebit: { accountLabel: string; amounts: StatementAmount[] } | null;
  sections: StatementSection[];
  totalRows: number;
  selectedRows: number;
  errorCount: number;
  duplicateCount: number;
  imported: number;
  batchId: string | null;
};

// ── Confirm (D12): el reporte revisado vuelve al server ─────────────────────────

export type RowDecision = {
  id: string;
  selected: boolean;
  date: string | null;
  description: string | null;
  amount: number | null;
  currency: string | null;
  type: 'EXPENSE' | 'INCOME' | null;
  section: StatementSectionKey;
  categoryId: string | null;
  paymentMethodId: string | null;
  personId: string | null;
  holderKey: string | null;
  /** D6: viajan para que el server rearme "PSA (cuota 14/15, compra del 16/05/2025)". */
  installmentNumber: number | null;
  installmentTotal: number | null;
  originalDate: string | null;
  externalRef: string | null;
  sharedAmount: number | null;
  settlesShareId: string | null;
  ownTransferAccountId: string | null;
};

export type NameLink = {
  rawAlias: string;
  /** null + createName vacío = "no es una persona" (un comercio). Se recuerda igual. */
  personId: string | null;
  createName: string | null;
};

export type StatementConfirmPayload = {
  accountId: string;
  sourceKind: StatementSourceKind;
  periodStart: string | null;
  periodEnd: string | null;
  forceMismatch: boolean;
  confirmAccountMismatch: boolean;
  updateCycle: boolean;
  holders: { key: string; mode: HolderMode; personId: string | null }[];
  nameLinks: NameLink[];
  rows: RowDecision[];
};

/** Fila del reporte, sea de la sección que sea, aplanada para contar y decidir. */
export function allRows(report: StatementReport): StatementRowResult[] {
  return report.sections.flatMap((section) => section.rows);
}
