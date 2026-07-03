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
      updateMutation.mutate({ id: transaction.id, changes }, { onSuccess: onClose });
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
        { onSuccess: onClose },
      );
    }
  };

  const isPending = mutation.isPending;

  return (
    <form onSubmit={handleSubmit} aria-label={isEdit ? 'Editar transacción' : 'Nueva transacción'}>
      <h2>{isEdit ? 'Editar transacción' : 'Nueva transacción'}</h2>

      <label htmlFor="tx-account">Cuenta</label>
      <select
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
      </select>

      <label htmlFor="tx-type">Tipo</label>
      <select
        id="tx-type"
        value={type}
        onChange={(e) => setType(e.target.value as TransactionType)}
        disabled={isEdit || isPending}
      >
        <option value="EXPENSE">Gasto</option>
        <option value="INCOME">Ingreso</option>
      </select>

      <label htmlFor="tx-amount">
        Monto{selectedAccount ? ` (${selectedAccount.currency})` : ''}
      </label>
      <input
        id="tx-amount"
        type="number"
        min="0.01"
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
        disabled={isPending}
      />

      <label htmlFor="tx-date">Fecha</label>
      <input
        id="tx-date"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        required
        disabled={isPending}
      />

      <label htmlFor="tx-category">Categoría</label>
      <select
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
      </select>

      <label htmlFor="tx-payment-method">Método de pago</label>
      <select
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
      </select>

      <label htmlFor="tx-description">Descripción</label>
      <input
        id="tx-description"
        type="text"
        maxLength={500}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        disabled={isPending}
      />

      {mutation.isError && <p role="alert">{transactionErrorMessage(mutation.error)}</p>}

      <button type="submit" disabled={isPending}>
        {isPending ? 'Guardando...' : 'Guardar'}
      </button>
      <button type="button" onClick={onClose} disabled={isPending}>
        Cancelar
      </button>
    </form>
  );
}
