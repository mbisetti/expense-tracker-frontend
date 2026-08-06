import { useState, type FormEvent } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { DateField } from '../../components/ui/DateField';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/toastContext';
import { numberToAmountDisplay, parseAmountInput } from '../../lib/money';
import { useAccounts } from '../accounts/useAccounts';
import { TYPE_LABELS } from '../accounts/typeLabels';
import { usePaymentMethods } from '../paymentMethods/usePaymentMethods';
import { useCreateTransaction } from '../transactions/useTransactionMutations';
import { transactionErrorMessage } from '../transactions/errorMessages';
import type { RecurringExpense } from './api';

type MarkRecurringPaidModalProps = {
  recurring: RecurringExpense;
  /** Vencimiento del mes que se está mirando (ver defaultPaidDate). */
  defaultDate: string;
  onClose: () => void;
};

// Registrar el pago de un recurrente MANUAL. Hasta ahora el único camino era ir a Movimientos,
// crear la tx a mano y acordarse de vincularla al recurrente desde el selector — si no, el
// recurrente quedaba "Pendiente" todo el mes aunque estuviera pago.
//
// No es un tap ciego: toca plata, así que se pre-confirma (cuenta, fecha y monto a la vista y
// editables). El monto viene cargado con el declarado pero se edita, que es el caso real de una
// factura de luz: declarás un promedio y pagás lo que vino.
export function MarkRecurringPaidModal({ recurring, defaultDate, onClose }: MarkRecurringPaidModalProps) {
  const toast = useToast();
  const [accountId, setAccountId] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [amount, setAmount] = useState(numberToAmountDisplay(recurring.amount));

  const { data: accounts } = useAccounts();
  const { data: paymentMethods } = usePaymentMethods(accountId || undefined);
  const createMutation = useCreateTransaction();

  const parsedAmount = parseAmountInput(amount);
  const canSubmit = accountId !== '' && date !== '' && parsedAmount > 0;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;
    createMutation.mutate(
      {
        accountId,
        type: 'EXPENSE',
        amount: parsedAmount,
        date,
        categoryId: recurring.categoryId,
        paymentMethodId: paymentMethodId || undefined,
        description: recurring.name,
        // La moneda tiene que ser la del recurrente: el backend rechaza el vínculo si difieren.
        currency: recurring.currency,
        recurringExpenseId: recurring.id,
      },
      {
        onSuccess: () => {
          toast.success(`${recurring.name} quedó pago.`);
          onClose();
        },
        onError: (error) => toast.error(transactionErrorMessage(error)),
      },
    );
  };

  const busy = createMutation.isPending;

  return (
    <Modal open onClose={onClose} title={`Marcar pagado: ${recurring.name}`} disableClose={busy}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Select
          label="¿De qué cuenta salió?"
          id="paid-account"
          value={accountId}
          onChange={(e) => {
            setAccountId(e.target.value);
            setPaymentMethodId(''); // el método depende de la cuenta
          }}
          required
          disabled={busy}
        >
          <option value="">Elegí una cuenta</option>
          {(accounts ?? []).map((account) => (
            <option key={account.id} value={account.id}>
              {account.name} · {TYPE_LABELS[account.type]}
            </option>
          ))}
        </Select>

        <Select
          label="Método (opcional)"
          id="paid-method"
          value={paymentMethodId}
          onChange={(e) => setPaymentMethodId(e.target.value)}
          disabled={busy || !accountId}
        >
          <option value="">{accountId ? 'Sin método' : 'Elegí una cuenta primero'}</option>
          {paymentMethods?.map((pm) => (
            <option key={pm.id} value={pm.id}>
              {pm.name}
            </option>
          ))}
        </Select>

        <div className="grid grid-cols-2 gap-3">
          <MoneyInput
            label={`Monto (${recurring.currency})`}
            id="paid-amount"
            value={amount}
            onValueChange={setAmount}
            required
            disabled={busy}
            helper="Podés cambiarlo si vino distinto."
          />
          <DateField
            label="Fecha"
            id="paid-date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={busy}
          />
        </div>

        <div className="flex gap-3">
          <Button type="submit" loading={busy} disabled={!canSubmit}>
            Registrar pago
          </Button>
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
