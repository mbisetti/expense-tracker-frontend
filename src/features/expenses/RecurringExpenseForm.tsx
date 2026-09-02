import { useState, type FormEvent } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { CurrencySelect } from '../../components/ui/CurrencySelect';
import { Switch } from '../../components/ui/Switch';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/toastContext';
import { useCategories } from '../categories/useCategories';
import { useAccounts } from '../accounts/useAccounts';
import { useMe } from '../auth/useMe';
import { currencyOptionsForAny } from '../../lib/currencyOptions';
import { usePaymentMethods } from '../paymentMethods/usePaymentMethods';
import { numberToAmountDisplay, parseAmountInput } from '../../lib/money';
import { transactionErrorMessage } from '../transactions/errorMessages';
import { RecurringConfigFields } from './RecurringConfigFields';
import {
  buildAutoDebitPayload,
  buildConfigPayload,
  configFromRecurring,
  emptyRecurringConfig,
  type RecurringConfig,
} from './recurringConfig';
import {
  useCreateRecurringExpense,
  useUpdateRecurringExpense,
  type CreateRecurringExpenseInput,
  type UpdateRecurringExpenseInput,
} from './useRecurringMutations';
import type { RecurringExpense } from './api';

type RecurringExpenseFormProps = {
  open: boolean;
  onClose: () => void;
  /** Moneda por defecto (tab activo). Ignorada en edición (la del recurrente, inmutable). */
  defaultCurrency: string;
  /** Presente = edición. */
  existing?: RecurringExpense;
};

export function RecurringExpenseForm({ open, onClose, defaultCurrency, existing }: RecurringExpenseFormProps) {
  const isEdit = existing !== undefined;
  const toast = useToast();
  const { data: categories } = useCategories();

  const [name, setName] = useState(existing?.name ?? '');
  const [amount, setAmount] = useState(existing ? numberToAmountDisplay(existing.amount) : '');
  const [currency, setCurrency] = useState(existing?.currency ?? defaultCurrency);
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? '');
  const [config, setConfig] = useState<RecurringConfig>(
    existing ? configFromRecurring(existing) : emptyRecurringConfig,
  );
  const [active, setActive] = useState(existing?.active ?? true);

  const patchConfig = (patch: Partial<RecurringConfig>) => setConfig((c) => ({ ...c, ...patch }));

  const { data: accounts } = useAccounts();
  const { data: me } = useMe();
  // S25.7: antes acá iba `[currency]`, una lista de UNA opción. Ver currencyOptionsForAny.
  const currencyOptions = currencyOptionsForAny(
    currency,
    accounts,
    me?.workingCurrencies,
    me?.defaultCurrency,
  );
  // Métodos de la cuenta de débito elegida (sólo cuando el débito automático está prendido).
  const { data: paymentMethods } = usePaymentMethods(
    config.autoDebit && config.debitAccountId ? config.debitAccountId : undefined,
  );

  const createMutation = useCreateRecurringExpense();
  const updateMutation = useUpdateRecurringExpense();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const categoryOptions = categories?.filter((c) => c.type === 'EXPENSE' || c.type === 'BOTH');

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const payload = buildConfigPayload(config);
    const autoDebit = buildAutoDebitPayload(config);

    if (isEdit) {
      // frequency presente → el server re-configura el bloque entero con estos campos.
      const changes: UpdateRecurringExpenseInput = {
        name,
        amount: parseAmountInput(amount),
        categoryId,
        active,
        frequency: config.frequency,
        billingDay: payload.billingDay ?? null,
        weekday: payload.weekday ?? null,
        dueMonth: payload.dueMonth ?? null,
        installmentsTotal: payload.installmentsTotal ?? null,
        cashPrice: payload.cashPrice ?? null,
        ...autoDebit,
      };
      updateMutation.mutate(
        { id: existing.id, changes },
        {
          onSuccess: () => {
            toast.success('Gasto recurrente actualizado.');
            onClose();
          },
          onError: (error) => toast.error(transactionErrorMessage(error)),
        },
      );
    } else {
      const input: CreateRecurringExpenseInput = {
        name,
        amount: parseAmountInput(amount),
        currency,
        categoryId,
        frequency: config.frequency,
        ...payload,
        ...autoDebit,
      };
      createMutation.mutate(input, {
        onSuccess: () => {
          toast.success('Gasto recurrente creado.');
          onClose();
        },
        onError: (error) => toast.error(transactionErrorMessage(error)),
      });
    }
  };

  // El débito automático exige elegir la cuenta de débito (el backend también lo valida).
  const canSubmit =
    name.trim() !== '' &&
    parseAmountInput(amount) > 0 &&
    categoryId !== '' &&
    (!config.autoDebit || config.debitAccountId !== '');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar gasto recurrente' : 'Nuevo gasto recurrente'}
      disableClose={isPending}
    >
      <form
        onSubmit={handleSubmit}
        aria-label={isEdit ? 'Editar gasto recurrente' : 'Nuevo gasto recurrente'}
        className="flex flex-col gap-3"
      >
        <Input
          label="Nombre"
          id="rec-name"
          type="text"
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={isPending}
        />

        <MoneyInput
          label={config.inInstallments ? 'Monto de la cuota' : 'Monto'}
          id="rec-amount"
          value={amount}
          onValueChange={setAmount}
          required
          disabled={isPending}
        />

        {isEdit ? (
          <Input label="Moneda" id="rec-currency-fixed" value={currency} readOnly disabled />
        ) : (
          <CurrencySelect
            id="rec-currency"
            label="Moneda"
            options={currencyOptions}
            value={currency}
            onChange={setCurrency}
            disabled={isPending}
          />
        )}

        <Select
          label="Categoría"
          id="rec-category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          required
          disabled={isPending}
        >
          <option value="">Elegí una categoría</option>
          {categoryOptions?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>

        <RecurringConfigFields value={config} onChange={patchConfig} idPrefix="rec" disabled={isPending} />

        {/* Sprint 24.4: débito automático. Al prender, aparecen los selects de cuenta y método. */}
        <div className="flex flex-col gap-3 rounded-md border border-line bg-surface-sunken p-3">
          <Switch
            id="rec-auto-debit"
            label="Débito automático"
            helper="La app genera la transacción sola el día del vencimiento."
            checked={config.autoDebit}
            onChange={(checked) =>
              patchConfig(
                checked
                  ? { autoDebit: true }
                  : { autoDebit: false, debitAccountId: '', debitPaymentMethodId: '' },
              )
            }
            disabled={isPending}
          />

          {config.autoDebit && (
            <>
              <Select
                label="Cuenta de débito"
                id="rec-debit-account"
                value={config.debitAccountId}
                onChange={(e) =>
                  // cambiar la cuenta resetea el método (depende de la cuenta)
                  patchConfig({ debitAccountId: e.target.value, debitPaymentMethodId: '' })
                }
                required
                disabled={isPending}
              >
                <option value="">Elegí una cuenta</option>
                {accounts?.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.currency})
                  </option>
                ))}
              </Select>

              <Select
                label="Método de pago"
                id="rec-debit-method"
                value={config.debitPaymentMethodId}
                onChange={(e) => patchConfig({ debitPaymentMethodId: e.target.value })}
                disabled={isPending || !config.debitAccountId}
              >
                <option value="">
                  {config.debitAccountId ? 'Sin método' : 'Elegí una cuenta primero'}
                </option>
                {paymentMethods?.map((pm) => (
                  <option key={pm.id} value={pm.id}>
                    {pm.name}
                  </option>
                ))}
              </Select>
            </>
          )}
        </div>

        {isEdit && (
          <Switch id="rec-active" label="Activo" checked={active} onChange={setActive} disabled={isPending} />
        )}

        <div className="mt-1 flex gap-3">
          <Button type="submit" loading={isPending} disabled={!canSubmit}>
            Guardar
          </Button>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
