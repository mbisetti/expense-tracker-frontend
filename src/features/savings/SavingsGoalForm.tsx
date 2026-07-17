import { useMemo, useState, type FormEvent } from 'react';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { DateField } from '../../components/ui/DateField';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/toastContext';
import { useAccounts } from '../accounts/useAccounts';
import { numberToAmountDisplay, parseAmountInput } from '../../lib/money';
import {
  useCreateSavingsGoal,
  useUpdateSavingsGoal,
  type UpdateSavingsGoalInput,
} from './useSavingsMutations';
import { savingsErrorMessage } from './errorMessages';
import type { SavingsGoalResponse } from './api';

type SavingsGoalFormProps = {
  goal?: SavingsGoalResponse;
  onClose: () => void;
  onDelete?: () => void;
};

export function SavingsGoalForm({ goal, onClose, onDelete }: SavingsGoalFormProps) {
  const isEdit = goal !== undefined;
  const toast = useToast();

  const [name, setName] = useState(goal?.name ?? '');
  const [target, setTarget] = useState(goal ? numberToAmountDisplay(goal.targetAmount) : '');
  const [current, setCurrent] = useState(goal ? numberToAmountDisplay(goal.currentAmount) : '');
  const [currency, setCurrency] = useState(goal?.currency ?? '');
  const [deadline, setDeadline] = useState(goal?.deadline ?? '');

  const { data: accounts } = useAccounts();
  const createMutation = useCreateSavingsGoal();
  const updateMutation = useUpdateSavingsGoal();
  const isPending = (isEdit ? updateMutation : createMutation).isPending;

  const currencies = useMemo(() => {
    const set = new Set((accounts ?? []).map((a) => a.currency));
    return set.size > 0 ? [...set] : ['ARS', 'USD'];
  }, [accounts]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isEdit) {
      const changes: UpdateSavingsGoalInput = {};
      if (name !== goal.name) changes.name = name;
      if (parseAmountInput(target) !== goal.targetAmount) changes.targetAmount = parseAmountInput(target);
      if (parseAmountInput(current) !== goal.currentAmount)
        changes.currentAmount = parseAmountInput(current);
      const newDeadline = deadline || null;
      if (newDeadline !== goal.deadline) changes.deadline = newDeadline;

      if (Object.keys(changes).length === 0) {
        onClose();
        return;
      }
      updateMutation.mutate(
        { id: goal.id, changes },
        {
          onSuccess: () => {
            toast.success('Objetivo actualizado.');
            onClose();
          },
          onError: (error) => toast.error(savingsErrorMessage(error)),
        },
      );
    } else {
      createMutation.mutate(
        {
          name,
          targetAmount: parseAmountInput(target),
          currency,
          deadline: deadline || undefined,
          currentAmount: current ? parseAmountInput(current) : undefined,
        },
        {
          onSuccess: () => {
            toast.success('Objetivo creado.');
            onClose();
          },
          onError: (error) => toast.error(savingsErrorMessage(error)),
        },
      );
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      aria-label={isEdit ? 'Editar objetivo' : 'Nuevo objetivo'}
      className="flex flex-col gap-3"
    >
      <Input
        label="Nombre"
        id="goal-name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        maxLength={255}
        disabled={isPending}
      />

      <MoneyInput
        label="Objetivo"
        id="goal-target"
        value={target}
        onValueChange={setTarget}
        required
        disabled={isPending}
      />

      <MoneyInput
        label={isEdit ? 'Ahorrado hasta ahora' : 'Ya ahorrado (opcional)'}
        id="goal-current"
        value={current}
        onValueChange={setCurrent}
        disabled={isPending}
      />

      {!isEdit && (
        <Select
          label="Moneda"
          id="goal-currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          required
          disabled={isPending}
        >
          <option value="">Elegí una moneda</option>
          {currencies.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      )}

      <DateField
        label="Fecha límite (opcional)"
        id="goal-deadline"
        value={deadline}
        onChange={(e) => setDeadline(e.target.value)}
        disabled={isPending}
      />

      <div className="flex items-center gap-3">
        <Button type="submit" loading={isPending}>
          Guardar
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
          disabled={isPending}
          className={isEdit && onDelete ? 'mx-auto' : undefined}
        >
          Cancelar
        </Button>
        {isEdit && onDelete && (
          <Button
            type="button"
            variant="ghost"
            onClick={onDelete}
            disabled={isPending}
            className="border-expense/40 text-expense hover:bg-expense/10 hover:text-expense"
          >
            Borrar
          </Button>
        )}
      </div>
    </form>
  );
}
