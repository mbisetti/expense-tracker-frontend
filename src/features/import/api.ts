// Import batch de movimientos (template XLSX) — tipos del contrato con /api/v1/import.

export type ImportRowStatus = 'OK' | 'WARNING' | 'ERROR';

export type RowIssue = {
  column: string;
  code: string;
  /** Mensaje es-AR accionable del server — se muestra TAL CUAL (los códigos son para tests). */
  message: string;
};

export type ImportRowResult = {
  /** Número REAL de fila en el xlsx, para que el usuario la encuentre en su Excel. */
  rowNumber: number;
  status: ImportRowStatus;
  date: string | null;
  description: string | null;
  categoryName: string | null;
  accountName: string | null;
  paymentMethodName: string | null;
  type: 'EXPENSE' | 'INCOME' | null;
  currency: string | null;
  amount: number | null;
  issues: RowIssue[];
};

// Mismo shape en dry-run y confirm (D3): imported/batchId solo vienen en un confirm exitoso.
export type ImportReport = {
  dryRun: boolean;
  totalRows: number;
  validCount: number;
  warningCount: number;
  errorCount: number;
  duplicateCount: number;
  imported: number;
  batchId: string | null;
  rows: ImportRowResult[];
};

export type ImportBatch = {
  id: string;
  filename: string;
  createdAt: string;
  rowCount: number;
  undoneAt: string | null;
};

export type ConfirmOptions = {
  skipInvalid: boolean;
  skipDuplicates: boolean;
};

// dryRun default TRUE en el server: importar de verdad SIEMPRE lo pide explícito el confirm —
// acá no se puede omitir el false como en buildExportQuery.
export function importQuery(dryRun: boolean, options?: ConfirmOptions): string {
  const params = new URLSearchParams({ dryRun: String(dryRun) });
  if (options?.skipInvalid) params.set('skipInvalid', 'true');
  if (options?.skipDuplicates) params.set('skipDuplicates', 'true');
  return `?${params.toString()}`;
}
