import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { DateField } from '../../components/ui/DateField';
import { Button } from '../../components/ui/Button';
import { formatMoney } from '../../lib/money';
import { useAccounts } from '../accounts/useAccounts';
import type { SettleDebtInput } from './api';

// La plata para devolverle a un amigo sale de una cuenta de ACTIVO. El backend rechaza el resto
// con NOT_AN_ASSET_ACCOUNT; acá directamente no se ofrecen. Espejo exacto de SettleDialog.
const LIABILITY_TYPES = ['CREDIT', 'DEBT'];

type SettleDebtDialogProps = {
  open: boolean;
  personName: string;
  amount: number;
  currency: string;
  loading?: boolean;
  onConfirm: (input: SettleDebtInput) => void;
  onCancel: () => void;
};

function todayLocal(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

// Espejo de SettleDialog (S29) del otro lado del mostrador. Dos diferencias, las dos a propósito:
//   · sin método de pago — saldar no es un gasto, es una TRANSFERENCIA a "Deudas con amigos"
//   · el copy explica por qué el mes no se mueve: la cena ya se contó el día que pasó
export function SettleDebtDialog({
  open,
  personName,
  amount,
  currency,
  loading,
  onConfirm,
  onCancel,
}: SettleDebtDialogProps) {
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(todayLocal());

  const { data: accounts } = useAccounts();
  const assetAccounts = (accounts ?? []).filter((a) => !LIABILITY_TYPES.includes(a.type));

  const handleConfirm = () => {
    if (!accountId) return;
    onConfirm({ accountId, date: date || undefined });
  };

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={`Saldar con ${personName}`}
      footer={
        <div className="flex gap-3">
          <Button type="button" onClick={handleConfirm} loading={loading} disabled={!accountId}>
            Registrar pago
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-body">
          Le devolvés a {personName}{' '}
          <span className="font-semibold tabular-nums text-ink">
            {formatMoney(amount, currency)}
          </span>
          .
        </p>

        <Select
          label="¿De qué cuenta salió?"
          id="settle-debt-account"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          required
          disabled={loading}
        >
          <option value="">Elegí una cuenta</option>
          {assetAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name} ({account.currency})
            </option>
          ))}
        </Select>

        <DateField
          label="Fecha"
          id="settle-debt-date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={loading}
        />

        <p className="text-xs text-muted">
          Se registra en {currency}, la moneda de la deuda. Baja el saldo de la cuenta pero no
          cuenta como gasto del mes: el gasto ya se contó el día que pasó.
        </p>
      </div>
    </Modal>
  );
}
