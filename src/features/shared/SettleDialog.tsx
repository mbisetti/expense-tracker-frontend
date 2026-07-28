import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { DateField } from '../../components/ui/DateField';
import { Button } from '../../components/ui/Button';
import { formatMoney } from '../../lib/money';
import { useAccounts } from '../accounts/useAccounts';
import { usePaymentMethods } from '../paymentMethods/usePaymentMethods';
import type { SettleInput } from './api';

// Las cuentas de PASIVO no reciben cobros: CREDIT es mono-moneda y una devolución de un amigo
// no baja una deuda; DEBT menos todavía. El backend rechaza con NOT_AN_ASSET_ACCOUNT — acá
// directamente no se ofrecen.
const LIABILITY_TYPES = ['CREDIT', 'DEBT'];

type SettleDialogProps = {
  open: boolean;
  personName: string;
  amount: number;
  currency: string;
  loading?: boolean;
  onConfirm: (input: SettleInput) => void;
  onCancel: () => void;
};

function todayLocal(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

export function SettleDialog({
  open,
  personName,
  amount,
  currency,
  loading,
  onConfirm,
  onCancel,
}: SettleDialogProps) {
  const [accountId, setAccountId] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [date, setDate] = useState(todayLocal());

  const { data: accounts } = useAccounts();
  const { data: paymentMethods } = usePaymentMethods(accountId || undefined);

  const assetAccounts = (accounts ?? []).filter((a) => !LIABILITY_TYPES.includes(a.type));

  const handleConfirm = () => {
    if (!accountId) return;
    onConfirm({
      accountId,
      paymentMethodId: paymentMethodId || undefined,
      date: date || undefined,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={`Cobrar a ${personName}`}
      footer={
        <div className="flex gap-3">
          <Button type="button" onClick={handleConfirm} loading={loading} disabled={!accountId}>
            Registrar cobro
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-body">
          {personName} te devolvió{' '}
          <span className="font-semibold tabular-nums text-ink">{formatMoney(amount, currency)}</span>.
        </p>

        <Select
          label="¿A qué cuenta entró?"
          id="settle-account"
          value={accountId}
          onChange={(e) => {
            setAccountId(e.target.value);
            setPaymentMethodId(''); // el método depende de la cuenta
          }}
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

        <Select
          label="Método (opcional)"
          id="settle-method"
          value={paymentMethodId}
          onChange={(e) => setPaymentMethodId(e.target.value)}
          disabled={loading || !accountId}
        >
          <option value="">{accountId ? 'Sin método' : 'Elegí una cuenta primero'}</option>
          {paymentMethods?.map((pm) => (
            <option key={pm.id} value={pm.id}>
              {pm.name}
            </option>
          ))}
        </Select>

        <DateField
          label="Fecha"
          id="settle-date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={loading}
        />

        <p className="text-xs text-muted">
          Se registra en {currency}, la moneda del gasto. Suma al saldo de la cuenta pero no cuenta
          como ingreso del mes: es tu plata volviendo.
        </p>
      </div>
    </Modal>
  );
}
