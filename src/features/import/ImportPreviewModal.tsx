import { useMemo, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Switch } from '../../components/ui/Switch';
import { formatMoney } from '../../lib/money';
import { formatDate, useDateFormat } from '../../lib/dateFormat';
import type { ConfirmOptions, ImportReport, ImportRowResult } from './api';

type ImportPreviewModalProps = {
  open: boolean;
  report: ImportReport;
  onClose: () => void;
  onConfirm: (options: ConfirmOptions) => void;
  isImporting: boolean;
};

const STATUS_ORDER: Record<ImportRowResult['status'], number> = { ERROR: 0, WARNING: 1, OK: 2 };

const STATUS_LABEL: Record<ImportRowResult['status'], string> = {
  ERROR: 'Error',
  WARNING: 'Aviso',
  OK: 'Lista',
};

const STATUS_CLASS: Record<ImportRowResult['status'], string> = {
  ERROR: 'text-expense',
  WARNING: 'text-warning',
  OK: 'text-income',
};

function isDuplicate(row: ImportRowResult): boolean {
  return row.issues.some((issue) => issue.code === 'DUPLICATE');
}

// Preview del import (§8): el usuario ve TODO lo que va a pasar antes de que pase. Errores
// arriba (es lo que tiene que arreglar), avisos después, listas al final.
export function ImportPreviewModal({ open, report, onClose, onConfirm, isImporting }: ImportPreviewModalProps) {
  const { pref } = useDateFormat();
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  const sorted = useMemo(
    () => [...report.rows].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]),
    [report.rows],
  );

  const validRows = report.rows.filter((row) => row.status !== 'ERROR');
  const duplicatesInValid = validRows.filter(isDuplicate).length;
  const importable = validRows.length - (skipDuplicates ? duplicatesInValid : 0);
  const hasErrors = report.errorCount > 0;

  const confirm = (skipInvalid: boolean) => onConfirm({ skipInvalid, skipDuplicates });

  const footer = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button type="button" variant="secondary" onClick={onClose} disabled={isImporting}>
        {importable > 0 ? 'Cancelar' : 'Cerrar'}
      </Button>
      {!hasErrors && importable > 0 && (
        <Button type="button" onClick={() => confirm(false)} loading={isImporting}>
          Importar {importable} {importable === 1 ? 'movimiento' : 'movimientos'}
        </Button>
      )}
      {hasErrors && importable > 0 && (
        // Con errores no hay import total: importar solo las válidas es decisión EXPLÍCITA (D4).
        <Button type="button" variant="secondary" onClick={() => confirm(true)} loading={isImporting}>
          Importar solo las {importable} válidas
        </Button>
      )}
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title="Revisar import" footer={footer} disableClose={isImporting}>
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted">
          <span className="text-income">{report.totalRows - report.errorCount} listas</span>
          {' · '}
          <span className="text-warning">{report.warningCount} con avisos</span>
          {' · '}
          <span className="text-expense">{report.errorCount} con errores</span>
        </p>

        {duplicatesInValid > 0 && (
          <Switch
            id="skip-duplicates"
            checked={skipDuplicates}
            onChange={setSkipDuplicates}
            label={`Omitir posibles duplicados (${duplicatesInValid})`}
          />
        )}

        <div className="max-h-[55vh] overflow-y-auto rounded-sm border border-line">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface text-left text-muted">
              <tr>
                <th className="px-2 py-1.5 font-medium">Fila</th>
                <th className="px-2 py-1.5 font-medium">Fecha</th>
                <th className="px-2 py-1.5 font-medium">Descripción</th>
                <th className="px-2 py-1.5 font-medium">Cuenta</th>
                <th className="px-2 py-1.5 text-right font-medium">Monto</th>
                <th className="px-2 py-1.5 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sorted.map((row) => (
                <RowGroup key={row.rowNumber} row={row} pref={pref} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}

function RowGroup({ row, pref }: { row: ImportRowResult; pref: 'ar' | 'us' }) {
  const amount =
    row.amount !== null && row.currency ? formatMoney(row.amount, row.currency) : (row.amount ?? '—');
  return (
    <>
      <tr>
        <td className="whitespace-nowrap px-2 py-1.5 tabular-nums text-muted">{row.rowNumber}</td>
        <td className="whitespace-nowrap px-2 py-1.5 font-semibold tabular-nums">
          {row.date ? formatDate(row.date, pref) : '—'}
        </td>
        <td className="max-w-48 truncate px-2 py-1.5" title={row.description ?? undefined}>
          {row.description ?? '—'}
        </td>
        <td className="max-w-36 truncate px-2 py-1.5">{row.accountName ?? '—'}</td>
        <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">
          {row.type === 'EXPENSE' ? '-' : ''}
          {amount}
        </td>
        <td className={`whitespace-nowrap px-2 py-1.5 ${STATUS_CLASS[row.status]}`}>
          {STATUS_LABEL[row.status]}
        </td>
      </tr>
      {row.issues.length > 0 && (
        <tr>
          <td colSpan={6} className="px-2 pb-2 pt-0">
            <ul className="flex flex-col gap-0.5 text-xs text-muted">
              {row.issues.map((issue, i) => (
                // El mensaje del server va TAL CUAL (§5) — es-AR y accionable.
                <li key={`${issue.code}-${i}`}>
                  <span className="font-medium">{issue.column}:</span> {issue.message}
                </li>
              ))}
            </ul>
          </td>
        </tr>
      )}
    </>
  );
}
