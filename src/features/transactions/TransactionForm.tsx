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
import { MoneyInput } from '../../components/ui/MoneyInput';
import { CurrencySelect } from '../../components/ui/CurrencySelect';
import { DateField } from '../../components/ui/DateField';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/toastContext';
import { numberToAmountDisplay, parseAmountInput } from '../../lib/money';
import type { TransactionListItem, TransactionType } from './api';

type TransactionFormProps = {
  transaction?: TransactionListItem;
  onClose: () => void;
  /** Tipo fijado desde afuera (selector de movimiento de la página): oculta el Select de Tipo. */
  lockedType?: TransactionType;
};

// Fecha local, no UTC — toISOString() adelanta un día pasadas las 21:00 en UTC-3
function todayLocal(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

export function TransactionForm({ transaction, onClose, lockedType }: TransactionFormProps) {
  const isEdit = transaction !== undefined;
  const toast = useToast();

  const [accountId, setAccountId] = useState(transaction?.accountId ?? '');
  const [type, setType] = useState<TransactionType>(transaction?.type ?? lockedType ?? 'EXPENSE');
  const [amount, setAmount] = useState(transaction ? numberToAmountDisplay(transaction.amount) : '');
  // Sprint 22: moneda de la tx. Default a la principal de la cuenta; se resetea al cambiar cuenta.
  const [currency, setCurrency] = useState(transaction?.currency ?? '');
  const [date, setDate] = useState(transaction?.date ?? todayLocal());
  const [categoryId, setCategoryId] = useState(transaction?.categoryId ?? '');
  const [paymentMethodId, setPaymentMethodId] = useState(transaction?.paymentMethodId ?? '');
  const [description, setDescription] = useState(transaction?.description ?? '');

  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  // Los métodos de pago se filtran por la cuenta elegida (Sprint 20 #6): cada método
  // pertenece a una cuenta.
  const { data: paymentMethods } = usePaymentMethods(accountId || undefined);

  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();
  const mutation = isEdit ? updateMutation : createMutation;

  const categoryOptions = categories?.filter(
    (c) => c.type === type || c.type === 'BOTH',
  );
  const selectedAccount = accounts?.find((a) => a.id === accountId);
  // CREDIT es mono-moneda (D2): no se muestra el selector, la moneda es la de la cuenta.
  const isCredit = selectedAccount?.type === 'CREDIT';
  // Monedas conocidas de la cuenta (principal primera) + "Otra…" para una moneda nueva.
  const currencyOptions = selectedAccount?.balances?.map((b) => b.currency) ?? [];
  // Moneda efectiva: la elegida, o la principal si aún no se tocó / es CREDIT.
  const effectiveCurrency = isCredit ? selectedAccount!.currency : currency || selectedAccount?.currency || '';

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isEdit) {
      // Solo campos que cambiaron: evita re-validaciones innecesarias del backend.
      // Vaciar un campo no se puede expresar en el PATCH (ausente = sin cambio).
      const changes: UpdateTransactionInput = {};
      if (parseAmountInput(amount) !== transaction.amount) changes.amount = parseAmountInput(amount);
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
          amount: parseAmountInput(amount),
          date,
          categoryId: categoryId || undefined,
          paymentMethodId: paymentMethodId || undefined,
          description: description || undefined,
          // Sprint 22: manda la moneda resuelta (principal si no se tocó el selector).
          currency: effectiveCurrency || undefined,
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
        onChange={(e) => {
          const newId = e.target.value;
          setAccountId(newId);
          setPaymentMethodId(''); // el método depende de la cuenta → se resetea al cambiarla
          // la moneda vuelve a la principal de la cuenta elegida (Sprint 22 D4)
          setCurrency(accounts?.find((a) => a.id === newId)?.currency ?? '');
        }}
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

      {/* Con lockedType (creación desde el selector de movimiento) el tipo ya está fijado
          afuera → no se muestra el Select para no duplicar la elección. En edición sí se
          muestra (deshabilitado: el tipo es inmutable). */}
      {!lockedType && (
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
      )}

      <MoneyInput
        label={`Monto${effectiveCurrency ? ` (${effectiveCurrency})` : ''}`}
        id="tx-amount"
        value={amount}
        onValueChange={setAmount}
        required
        disabled={isPending}
      />

      {/* Selector de moneda discreto (Sprint 22 D4): solo en alta y solo si la cuenta no es
          CREDIT (mono-moneda). Se remonta con key={accountId} para resetear el modo "Otra…". */}
      {!isEdit && selectedAccount && !isCredit && (
        <CurrencySelect
          key={accountId}
          id="tx-currency"
          label="Moneda"
          options={currencyOptions}
          value={currency}
          onChange={setCurrency}
          disabled={isPending}
        />
      )}

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
        disabled={isPending || !accountId}
      >
        <option value="">
          {accountId ? 'Sin método de pago' : 'Elegí una cuenta primero'}
        </option>
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
