// Sprint 26 — Reportes v1: los cuatro datasets exportables (alcance v1 cerrado por Marko).
export type ExportDataset = 'transactions' | 'accounts' | 'expenses' | 'incomes';

export const DATASET_LABELS: Record<ExportDataset, string> = {
  transactions: 'Transacciones',
  accounts: 'Movimientos por cuenta',
  expenses: 'Gastos',
  incomes: 'Ingresos',
};

// Nombre de respaldo si el Content-Disposition no llega (el server manda uno igual a este).
const DATASET_FILES: Record<ExportDataset, string> = {
  transactions: 'transacciones',
  accounts: 'movimientos',
  expenses: 'gastos',
  incomes: 'ingresos',
};

export type ExportParams = Record<string, string | number | boolean | undefined>;

export function buildExportQuery(params: ExportParams = {}): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    // `false` se omite igual que undefined: los flags del backend ya vienen en false por default
    // (mismo criterio que buildTransactionsQuery con uncategorized).
    if (value === undefined || value === '' || value === false) continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export function fallbackFilename(dataset: ExportDataset, today: Date): string {
  const stamp = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('');
  return `manguitos-${DATASET_FILES[dataset]}-${stamp}.xlsx`;
}
