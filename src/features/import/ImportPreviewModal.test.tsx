import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ImportPreviewModal } from './ImportPreviewModal';
import type { ImportReport, ImportRowResult } from './api';

function row(overrides: Partial<ImportRowResult>): ImportRowResult {
  return {
    rowNumber: 2,
    status: 'OK',
    date: '2026-07-15',
    description: 'Chino',
    categoryName: null,
    accountName: 'Efectivo',
    paymentMethodName: null,
    type: 'EXPENSE',
    currency: 'ARS',
    amount: 1500,
    issues: [],
    ...overrides,
  };
}

function report(rows: ImportRowResult[], overrides: Partial<ImportReport> = {}): ImportReport {
  const errorCount = rows.filter((r) => r.status === 'ERROR').length;
  return {
    dryRun: true,
    totalRows: rows.length,
    validCount: rows.length - errorCount,
    warningCount: rows.filter((r) => r.status === 'WARNING').length,
    errorCount,
    duplicateCount: rows.filter((r) => r.issues.some((i) => i.code === 'DUPLICATE')).length,
    imported: 0,
    batchId: null,
    rows,
    ...overrides,
  };
}

const noop = () => undefined;

describe('ImportPreviewModal', () => {
  it('ordena errores arriba y muestra el mensaje del server tal cual', () => {
    const rows = [
      row({ rowNumber: 2, description: 'sana' }),
      row({
        rowNumber: 3,
        status: 'ERROR',
        description: 'rota',
        issues: [{ column: 'Cuenta', code: 'UNKNOWN_ACCOUNT', message: 'No existe una cuenta "Fantasma"' }],
      }),
    ];
    render(
      <ImportPreviewModal open report={report(rows)} onClose={noop} onConfirm={noop} isImporting={false} />,
    );

    const cells = screen.getAllByRole('row').map((r) => r.textContent);
    // La fila 3 (ERROR) aparece antes que la 2 (OK).
    expect(cells.join('|').indexOf('rota')).toBeLessThan(cells.join('|').indexOf('sana'));
    expect(screen.getByText(/No existe una cuenta "Fantasma"/)).toBeInTheDocument();
  });

  it('sin errores ofrece importar todo; con errores solo "las válidas"', () => {
    const onConfirm = vi.fn();
    const clean = report([row({}), row({ rowNumber: 3 })]);
    const { rerender } = render(
      <ImportPreviewModal open report={clean} onClose={noop} onConfirm={onConfirm} isImporting={false} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Importar 2 movimientos' }));
    expect(onConfirm).toHaveBeenCalledWith({ skipInvalid: false, skipDuplicates: true });

    const withErrors = report([row({}), row({ rowNumber: 3, status: 'ERROR', issues: [] })]);
    rerender(
      <ImportPreviewModal open report={withErrors} onClose={noop} onConfirm={onConfirm} isImporting={false} />,
    );
    expect(screen.queryByRole('button', { name: /^Importar \d+ movimientos$/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Importar solo las 1 válidas' }));
    expect(onConfirm).toHaveBeenLastCalledWith({ skipInvalid: true, skipDuplicates: true });
  });

  it('el switch de duplicados (default ON) descuenta del total a importar', () => {
    const dup = row({
      rowNumber: 3,
      status: 'WARNING',
      issues: [{ column: 'Monto', code: 'DUPLICATE', message: 'Ya existe un movimiento igual' }],
    });
    render(
      <ImportPreviewModal
        open
        report={report([row({}), dup])}
        onClose={noop}
        onConfirm={noop}
        isImporting={false}
      />,
    );

    // Default ON: el duplicado no cuenta.
    expect(screen.getByRole('button', { name: 'Importar 1 movimiento' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch', { name: /Omitir posibles duplicados/ }));
    expect(screen.getByRole('button', { name: 'Importar 2 movimientos' })).toBeInTheDocument();
  });

  it('con cero filas importables solo queda cerrar', () => {
    const broken = report([row({ status: 'ERROR', issues: [] })]);
    render(
      <ImportPreviewModal open report={broken} onClose={noop} onConfirm={noop} isImporting={false} />,
    );
    // Dos "Cerrar": el del footer y la X del Modal — lo que importa es que no haya CTA de import.
    expect(screen.getAllByRole('button', { name: 'Cerrar' })).not.toHaveLength(0);
    expect(screen.queryByRole('button', { name: /Importar/ })).toBeNull();
  });
});
