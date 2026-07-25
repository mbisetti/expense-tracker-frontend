import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { DateField } from '../../components/ui/DateField';
import { useAccounts } from '../accounts/useAccounts';
import { useExport } from './useExport';
import { DATASET_LABELS, type ExportDataset } from './api';

const DATASETS: ExportDataset[] = ['transactions', 'accounts', 'expenses', 'incomes'];

// Sprint 26 — sección "Exportación" de /datos: la puerta de entrada "dump" (elegís QUÉ
// exportar). La otra puerta es el botón de Transacciones, que exporta lo que estás viendo.
export function ExportSection() {
  const [dataset, setDataset] = useState<ExportDataset>('transactions');
  const [accountId, setAccountId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: accounts } = useAccounts();
  const { exportFile, isExporting } = useExport();

  const perAccount = dataset === 'accounts';

  const handleExport = () => {
    void exportFile(dataset, {
      // La cuenta sólo aplica a "Movimientos por cuenta"; en el resto, ausente = todas.
      accountId: perAccount ? accountId || undefined : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    });
  };

  return (
    <Card>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col">
          <h2 className="text-lg font-semibold text-ink">Exportación</h2>
          <span className="text-sm text-muted">
            Se descarga un archivo .xlsx con una hoja de resumen.
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select
            label="Qué exportar"
            id="export-dataset"
            value={dataset}
            onChange={(e) => {
              setDataset(e.target.value as ExportDataset);
              setAccountId('');
            }}
          >
            {DATASETS.map((value) => (
              <option key={value} value={value}>
                {DATASET_LABELS[value]}
              </option>
            ))}
          </Select>

          {perAccount && (
            <Select
              label="Cuenta"
              id="export-account"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              <option value="">Todas las cuentas</option>
              {accounts?.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>
          )}

          <DateField
            label="Desde"
            id="export-date-from"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <DateField
            label="Hasta"
            id="export-date-to"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>

        <div>
          <Button type="button" onClick={handleExport} loading={isExporting}>
            Exportar
          </Button>
        </div>
      </div>
    </Card>
  );
}
