import { useState, type FormEvent } from 'react';
import { useAccounts } from '../accounts/useAccounts';
import { useCategories } from '../categories/useCategories';
import { usePaymentMethods } from '../paymentMethods/usePaymentMethods';
import {
  useCreateTransaction,
  useUpdateTransaction,
  type UpdateTransactionInput,
} from './useTransactionMutations';
import { transactionErrorMessage } from './errorMessages';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { DateField } from '../../components/ui/DateField';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/toastContext';
import type { TransactionListItem, TransactionType } from './api';

type TransactionFormProps = {
  transaction?: TransactionListItem;
  onClose: () => void;
};

// Fecha local, no UTC — toISOString() adelanta un día pasadas las 21:00 en UTC-3
function todayLocal(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

export function TransactionForm({ transaction, onClose }: TransactionFormProps) {
  const isEdit = transaction !== undefined;
  const toast = useToast();

  const [accountId, setAccountId] = useState(transaction?.accountId ?? '');
  const [type, setType] = useState<TransactionType>(transaction?.type ?? 'EXPENSE');
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : '');
  const [date, setDate] = useState(transaction?.date ?? todayLocal());
  const [categoryId, setCategoryId] = useState(transaction?.categoryId ?? '');
  const [paymentMethodId, setPaymentMethodId] = useState(transaction?.paymentMethodId ?? '');
  const [description, setDescription] = useState(transaction?.description ?? '');

  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const { data: paymentMethods } = usePaymentMethods();

  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();
  const mutation = isEdit ? updateMutation : createMutation;

  const categoryOptions = categories?.filter(
    (c) => c.type === type || c.type === 'BOTH',
  );
  const selectedAccount = accounts?.find((a) => a.id === accountId);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isEdit) {
      // Solo campos que cambiaron: evita re-validaciones innecesarias del backend.
      // Vaciar un campo no se puede expresar en el PATCH (ausente = sin cambio).
      const changes: UpdateTransactionInput = {};
      if (Number(amount) !== transaction.amount) changes.amount = Number(amount);
      if (date !== transaction.date) changes.date = date;
      if (categoryId && categoryId !== transaction.categoryId) changes.categoryId = categoryId;
      if (paymentMethodId && paymentMethodId !== transaction.paymentMethodId)
        changes.paymentMethodId = paymentMethodId;
      if (description && description !== transaction.description)
        changes.description = description;

      if (Object.keys(changes).length === 0) {
        onClose();
        return;
      }
      updateMutation.mutate(
        { id: transaction.id, changes },
        {
          onSuccess: () => {
            toast.success('Transacción actualizada.');
            onClose();
          },
          onError: (error) => toast.error(transactionErrorMessage(error)),
        },
      );
    } else {
      createMutation.mutate(
        {
          accountId,
          type,
          amount: Number(amount),
          date,
          categoryId: categoryId || undefined,
          paymentMethodId: paymentMethodId || undefined,
          description: description || undefined,
        },
        {
          onSuccess: () => {
            toast.success('Transacción guardada.');
            onClose();
          },
          onError: (error) => toast.error(transactionErrorMessage(error)),
        },
      );
    }
  };

  const isPending = mutation.isPending;

  return (
    <form
      onSubmit={handleSubmit}
      aria-label={isEdit ? 'Editar transacción' : 'Nueva transacción'}
      className="flex flex-col gap-3 rounded-md border border-line bg-surface-elevated p-4"
    >
      <h2 className="text-lg font-semibold text-ink">
        {isEdit ? 'Editar transacción' : 'Nueva transacción'}
      </h2>

      <Select
        label="Cuenta"
        id="tx-account"
        value={accountId}
        onChange={(e) => setAccountId(e.target.value)}
        required
        disabled={isEdit || isPending}
      >
        <option value="">Elegí una cuenta</option>
        {accounts?.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name} ({account.currency})
          </option>
        ))}
      </Select>

      <Select
        label="Tipo"
        id="tx-type"
        value={type}
        onChange={(e) => setType(e.target.value as TransactionType)}
        disabled={isEdit || isPending}
      >
        <option value="EXPENSE">Gasto</option>
        <option value="INCOME">Ingreso</option>
      </Select>

      <Input
        label={`Monto${selectedAccount ? ` (${selectedAccount.currency})` : ''}`}
        id="tx-amount"
        type="number"
        min="0.01"
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
        disabled={isPending}
      />

      <DateField
        label="Fecha"
        id="tx-date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        required
        disabled={isPending}
      />

      <Select
        label="Categoría"
        id="tx-category"
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        disabled={isPending}
      >
        <option value="">Sin categoría</option>
        {categoryOptions?.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </Select>

      <Select
        label="Método de pago"
        id="tx-payment-method"
        value={paymentMethodId}
        onChange={(e) => setPaymentMethodId(e.target.value)}
        disabled={isPending}
      >
        <option value="">Sin método de pago</option>
        {paymentMethods?.map((pm) => (
          <option key={pm.id} value={pm.id}>
            {pm.name}
          </option>
        ))}
      </Select>

      <Input
        label="Descripción"
        id="tx-description"
        type="text"
        maxLength={500}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        disabled={isPending}
      />

      <div className="flex gap-3">
        <Button type="submit" loading={isPending}>
          Guardar
        </Button>
        <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
