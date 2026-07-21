import { useState, type FormEvent } from 'react';
import { useAccounts } from '../accounts/useAccounts';
import { useCategories } from '../categories/useCategories';
import { usePaymentMethods } from '../paymentMethods/usePaymentMethods';
import {
  useCreateTransaction,
  useUpdateTransaction,
  type CreateTransactionInput,
  type UpdateTransactionInput,
} from './useTransactionMutations';
import { transactionErrorMessage } from './errorMessages';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { DateField } from '../../components/ui/DateField';
import { Switch } from '../../components/ui/Switch';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/toastContext';
import { numberToAmountDisplay, parseAmountInput } from '../../lib/money';
import { useRecurringExpenses } from '../expenses/useRecurringExpenses';
import { useCreateRecurringExpense } from '../expenses/useRecurringMutations';
import { RecurringConfigFields } from '../expenses/RecurringConfigFields';
import { buildConfigPayload, emptyRecurringConfig, type RecurringConfig } from '../expenses/recurringConfig';
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

// Sentinela de "Otra moneda…" en el selector de moneda (D8).
const OTHER_CCY = '__other__';
// Sentinela de "+ Nuevo gasto recurrente…" en el selector de recurrente (S24.3).
const RECURRING_NEW = '__new_recurring__';

export function TransactionForm({ transaction, onClose, lockedType }: TransactionFormProps) {
  const isEdit = transaction !== undefined;
  const toast = useToast();

  const [accountId, setAccountId] = useState(transaction?.accountId ?? '');
  const [type, setType] = useState<TransactionType>(transaction?.type ?? lockedType ?? 'EXPENSE');
  const [amount, setAmount] = useState(transaction ? numberToAmountDisplay(transaction.amount) : '');
  // Sprint 22: moneda de la tx. Default a la principal de la cuenta; se resetea al cambiar cuenta.
  const [currency, setCurrency] = useState(transaction?.currency ?? '');
  // Sprint 23 (D8): modo "Otra…" del selector de moneda (input de 3 letras en fila propia).
  const [currencyIsOther, setCurrencyIsOther] = useState(false);
  const [date, setDate] = useState(transaction?.date ?? todayLocal());
  const [categoryId, setCategoryId] = useState(transaction?.categoryId ?? '');
  const [paymentMethodId, setPaymentMethodId] = useState(transaction?.paymentMethodId ?? '');
  const [description, setDescription] = useState(transaction?.description ?? '');

  // Sprint 24.3: vínculo a un gasto recurrente (solo en gastos). Precargado en edición si ya
  // está vinculada. recurringId = id existente | RECURRING_NEW | ''.
  const [recurringEnabled, setRecurringEnabled] = useState(
    isEdit && transaction?.recurringExpenseId != null,
  );
  const [recurringId, setRecurringId] = useState(transaction?.recurringExpenseId ?? '');
  const [recName, setRecName] = useState('');
  const [recConfig, setRecConfig] = useState<RecurringConfig>(emptyRecurringConfig);

  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  // Los métodos de pago se filtran por la cuenta elegida (Sprint 20 #6): cada método
  // pertenece a una cuenta.
  const { data: paymentMethods } = usePaymentMethods(accountId || undefined);
  const { data: recurringList } = useRecurringExpenses();

  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();
  const createRecurringMutation = useCreateRecurringExpense();
  const mutation = isEdit ? updateMutation : createMutation;

  const categoryOptions = categories?.filter(
    (c) => c.type === type || c.type === 'BOTH',
  );
  const selectedAccount = accounts?.find((a) => a.id === accountId);
  // Sprint 22.2 (D6): el "método" puede ser un PaymentMethod (uuid) o una tarjeta de crédito
  // hija (value "card:<accountId>"). Si es una tarjeta, la tx cae en la cuenta-tarjeta.
  const selectedCardId = paymentMethodId.startsWith('card:') ? paymentMethodId.slice(5) : null;
  const routedAccount = selectedCardId
    ? accounts?.find((a) => a.id === selectedCardId)
    : selectedAccount;
  // CREDIT es mono-moneda (D2): no se muestra el selector, la moneda es la de la cuenta.
  const isCredit = routedAccount?.type === 'CREDIT';
  // Monedas conocidas de la cuenta (principal primera) + "Otra…" para una moneda nueva.
  const currencyOptions = routedAccount?.balances?.map((b) => b.currency) ?? [];
  // Moneda efectiva: la elegida, o la principal si aún no se tocó / es CREDIT (o tarjeta).
  const effectiveCurrency = isCredit
    ? routedAccount!.currency
    : currency || selectedAccount?.currency || '';

  // Sprint 24.3: recurrentes activos de la moneda efectiva (el vínculo exige moneda igual).
  const recurringOptions = (recurringList ?? []).filter(
    (r) => r.active && r.currency === effectiveCurrency,
  );

  // Selector de cuenta (D7): activos + DEBT + CREDIT sin vínculo. Las CREDIT vinculadas se
  // eligen por el método; en edición se incluye la cuenta real de la tx aunque esté oculta.
  const accountOptions = (accounts ?? []).filter((a) => {
    if (a.type === 'CREDIT' && a.linkedAccountId) {
      return isEdit && a.id === transaction?.accountId;
    }
    return true;
  });
  // Tarjetas de crédito hijas de la cuenta elegida → opciones extra del selector de método.
  const linkedCards = (accounts ?? []).filter(
    (a) => a.type === 'CREDIT' && a.linkedAccountId === accountId,
  );

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

      // Sprint 24.3: set/clear del vínculo recurrente (solo gastos). "" = desvincular.
      if (type === 'EXPENSE') {
        const was = transaction.recurringExpenseId ?? null;
        if (recurringEnabled && recurringId && recurringId !== RECURRING_NEW) {
          if (recurringId !== was) changes.recurringExpenseId = recurringId;
        } else if (!recurringEnabled && was) {
          changes.recurringExpenseId = '';
        }
      }

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
      // Ruteo de tarjeta (D6): si se eligió una tarjeta hija, la tx cae en ELLA y no
      // lleva método de pago; si no, la cuenta y el PM elegidos.
      const baseInput: CreateTransactionInput = {
        accountId: selectedCardId ?? accountId,
        type,
        amount: parseAmountInput(amount),
        date,
        categoryId: categoryId || undefined,
        paymentMethodId: selectedCardId ? undefined : paymentMethodId || undefined,
        description: description || undefined,
        // Sprint 22: manda la moneda resuelta (principal si no se tocó el selector).
        currency: effectiveCurrency || undefined,
      };

      const createTx = (recurringExpenseId?: string) =>
        createMutation.mutate(
          { ...baseInput, recurringExpenseId },
          {
            onSuccess: () => {
              toast.success('Transacción guardada.');
              onClose();
            },
            onError: (error) => toast.error(transactionErrorMessage(error)),
          },
        );

      const linkNew = type === 'EXPENSE' && recurringEnabled && recurringId === RECURRING_NEW;
      if (linkNew) {
        // Alta inline = DOS llamadas (D2/§9.2): crear el recurrente, después la tx vinculada.
        // Si la 2ª falla, el recurrente QUEDA creado y el toast lo dice (sin tx cross-endpoint).
        if (!categoryId) {
          toast.error('Elegí una categoría para el gasto recurrente.');
          return;
        }
        createRecurringMutation.mutate(
          {
            name: recName || description || 'Gasto recurrente',
            amount: parseAmountInput(amount),
            currency: effectiveCurrency,
            categoryId,
            frequency: recConfig.frequency,
            ...buildConfigPayload(recConfig),
          },
          {
            onSuccess: (created) =>
              createMutation.mutate(
                { ...baseInput, recurringExpenseId: created.id },
                {
                  onSuccess: () => {
                    toast.success('Transacción guardada.');
                    onClose();
                  },
                  onError: () =>
                    toast.error(
                      'El gasto recurrente se creó; reintentá guardar el gasto o vinculalo editándolo.',
                    ),
                },
              ),
            onError: (error) => toast.error(transactionErrorMessage(error)),
          },
        );
        return;
      }

      const link =
        type === 'EXPENSE' && recurringEnabled && recurringId && recurringId !== RECURRING_NEW
          ? recurringId
          : undefined;
      createTx(link);
    }
  };

  const isPending = mutation.isPending || createRecurringMutation.isPending;

  return (
    <form
      onSubmit={handleSubmit}
      aria-label={isEdit ? 'Editar transacción' : 'Nueva transacción'}
      className="flex flex-col gap-3 rounded-md border border-line bg-surface-elevated p-4"
    >
      <h2 className="text-lg font-semibold text-ink">
        {isEdit ? 'Editar transacción' : 'Nueva transacción'}
      </h2>

      {/* D8: cuenta ¾ + moneda ¼ en una fila. El chip fijo de CREDIT ocupa el ¼; en modo
          "Otra…" el input de 3 letras baja a su propia fila full-width (no se aprieta acá). */}
      <div className="grid grid-cols-4 gap-3">
        <div className="col-span-3">
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
              setCurrencyIsOther(false);
              setRecurringId(''); // el vínculo recurrente exige moneda igual → se resetea (S24.3)
            }}
            required
            disabled={isEdit || isPending}
          >
            <option value="">Elegí una cuenta</option>
            {accountOptions.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.currency})
              </option>
            ))}
          </Select>
        </div>

        <div className="col-span-1">
          {!isEdit && routedAccount && !isCredit ? (
            <Select
              label="Moneda"
              id="tx-currency"
              value={currencyIsOther ? OTHER_CCY : currency}
              onChange={(e) => {
                const v = e.target.value;
                setRecurringId(''); // moneda distinta → reset del selector recurrente (S24.3)
                if (v === OTHER_CCY) {
                  setCurrencyIsOther(true);
                  setCurrency('');
                } else {
                  setCurrencyIsOther(false);
                  setCurrency(v);
                }
              }}
              disabled={isPending}
            >
              {currencyOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value={OTHER_CCY}>Otra…</option>
            </Select>
          ) : (
            // CREDIT (mono-moneda) o edición (moneda inmutable): chip fijo con la moneda efectiva.
            <Input label="Moneda" id="tx-currency-fixed" value={effectiveCurrency} readOnly disabled />
          )}
        </div>
      </div>

      {/* Otra moneda (D8): fila propia full-width, sólo en alta y cuenta no-CREDIT. */}
      {!isEdit && !isCredit && currencyIsOther && (
        <Input
          label="Moneda (3 letras)"
          id="tx-currency-other"
          type="text"
          value={currency}
          onChange={(e) => {
            setRecurringId('');
            setCurrency(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3));
          }}
          maxLength={3}
          placeholder="EUR"
          disabled={isPending}
        />
      )}

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
        {/* Sprint 22.2 (D6): cada tarjeta de crédito hija de la cuenta elegida es una opción
            del método; elegirla rutea la tx a la cuenta-tarjeta. Sólo en alta (accountId
            es inmutable en edición). */}
        {!isEdit &&
          linkedCards.map((card) => (
            <option key={card.id} value={`card:${card.id}`}>
              {card.name} - Crédito
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

      {/* Sprint 24.3: vínculo a un gasto recurrente (solo gastos). Elegir uno existente prefillea
          categoría + monto; "+ Nuevo" expande la config inline (usa la moneda de la tx). */}
      {type === 'EXPENSE' && (
        <div className="flex flex-col gap-3 rounded-md border border-line bg-surface p-3">
          <Switch
            id="tx-recurring"
            label="Gasto recurrente"
            checked={recurringEnabled}
            onChange={(v) => {
              setRecurringEnabled(v);
              if (!v) setRecurringId('');
            }}
            disabled={isPending}
          />

          {recurringEnabled && (
            <>
              <Select
                label="¿Cuál?"
                id="tx-recurring-which"
                value={recurringId}
                onChange={(e) => {
                  const v = e.target.value;
                  setRecurringId(v);
                  if (v && v !== RECURRING_NEW) {
                    const rec = recurringOptions.find((r) => r.id === v);
                    if (rec) {
                      setCategoryId(rec.categoryId);
                      setAmount(numberToAmountDisplay(rec.amount));
                    }
                  }
                }}
                disabled={isPending}
              >
                <option value="">Elegí un gasto recurrente</option>
                {recurringOptions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
                {!isEdit && <option value={RECURRING_NEW}>+ Nuevo gasto recurrente…</option>}
              </Select>

              {!isEdit && recurringId === RECURRING_NEW && (
                <>
                  <Input
                    label="Nombre del gasto recurrente"
                    id="tx-recurring-name"
                    type="text"
                    maxLength={100}
                    value={recName}
                    onChange={(e) => setRecName(e.target.value)}
                    disabled={isPending}
                  />
                  <RecurringConfigFields
                    value={recConfig}
                    onChange={(patch) => setRecConfig((c) => ({ ...c, ...patch }))}
                    idPrefix="tx-recurring"
                    disabled={isPending}
                  />
                  <p className="text-xs text-muted">
                    Usa la moneda ({effectiveCurrency || '—'}), el monto y la categoría de este gasto.
                  </p>
                </>
              )}
            </>
          )}
        </div>
      )}

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
