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
import { numberToAmountDisplay, parseAmountInput } from '../../lib/money';
import { transactionErrorMessage } from '../transactions/errorMessages';
import { RecurringConfigFields } from './RecurringConfigFields';
import {
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

  const createMutation = useCreateRecurringExpense();
  const updateMutation = useUpdateRecurringExpense();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const categoryOptions = categories?.filter((c) => c.type === 'EXPENSE' || c.type === 'BOTH');

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const payload = buildConfigPayload(config);

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

  const canSubmit = name.trim() !== '' && parseAmountInput(amount) > 0 && categoryId !== '';

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
            options={currency ? [currency] : []}
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
