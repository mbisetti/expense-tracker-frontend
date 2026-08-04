import { useMemo, useState, type FormEvent } from 'react';
import { Select } from '../../components/ui/Select';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/toastContext';
import { useCategories } from '../categories/useCategories';
import { useAccounts } from '../accounts/useAccounts';
import { numberToAmountDisplay, parseAmountInput } from '../../lib/money';
import { useCreateBudget, useUpdateBudget } from './useBudgetMutations';
import { budgetErrorMessage } from './errorMessages';
import type { BudgetProgress } from './api';

type BudgetFormProps = {
  budget?: BudgetProgress;
  onClose: () => void;
  onDelete?: () => void;
};

export function BudgetForm({ budget, onClose, onDelete }: BudgetFormProps) {
  const isEdit = budget !== undefined;
  const toast = useToast();

  const [categoryId, setCategoryId] = useState(budget?.categoryId ?? '');
  const [limit, setLimit] = useState(budget ? numberToAmountDisplay(budget.limitAmount) : '');
  const [currency, setCurrency] = useState(budget?.currency ?? '');

  const { data: categories } = useCategories();
  const { data: accounts } = useAccounts();
  const createMutation = useCreateBudget();
  const updateMutation = useUpdateBudget();
  const isPending = (isEdit ? updateMutation : createMutation).isPending;

  // Los presupuestos limitan gastos → categorías EXPENSE o BOTH.
  const expenseCategories = categories?.filter((c) => c.type === 'EXPENSE' || c.type === 'BOTH');
  const currencies = useMemo(() => {
    const set = new Set((accounts ?? []).map((a) => a.currency));
    return set.size > 0 ? [...set] : ['ARS', 'USD'];
  }, [accounts]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isEdit) {
      updateMutation.mutate(
        { id: budget.budgetId, limitAmount: parseAmountInput(limit) },
        {
          onSuccess: () => {
            toast.success('Presupuesto actualizado.');
            onClose();
          },
          onError: (error) => toast.error(budgetErrorMessage(error)),
        },
      );
    } else {
      const now = new Date();
      createMutation.mutate(
        {
          categoryId,
          limitAmount: parseAmountInput(limit),
          currency,
          month: now.getMonth() + 1,
          year: now.getFullYear(),
        },
        {
          onSuccess: () => {
            toast.success('Presupuesto creado.');
            onClose();
          },
          onError: (error) => toast.error(budgetErrorMessage(error)),
        },
      );
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      aria-label={isEdit ? 'Editar presupuesto' : 'Nuevo presupuesto'}
      className="flex flex-col gap-3"
    >
      {isEdit ? (
        <p className="text-sm text-body">
          Categoría: <span className="text-ink">{budget.categoryName}</span>
        </p>
      ) : (
        <>
          <Select
            label="Categoría"
            id="budget-category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
            disabled={isPending}
          >
            <option value="">Elegí una categoría</option>
            {expenseCategories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>

          <Select
            label="Moneda"
            id="budget-currency"
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
        </>
      )}

      <MoneyInput
        label="Límite mensual"
        id="budget-limit"
        value={limit}
        onValueChange={setLimit}
        required
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
        >
          Cancelar
        </Button>
        {isEdit && onDelete && (
          <Button
            type="button"
            variant="ghost"
            onClick={onDelete}
            disabled={isPending}
            className="ml-auto border-expense/40 text-expense hover:bg-expense/10 hover:text-expense"
          >
            Borrar
          </Button>
        )}
      </div>
    </form>
  );
}
