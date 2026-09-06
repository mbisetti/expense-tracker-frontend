import { useState } from 'react';
import { Amount } from '../../components/ui/Amount';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { DeleteButton } from '../../components/ui/ActionsMenu';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/toastContext';
import { formatDate, useDateFormat } from '../../lib/dateFormat';
import { groupErrorMessage } from './errorMessages';
import { useDeleteGroupExpense, useGroupExpenses } from './useGroupExpenses';

type GroupExpensesSectionProps = {
  groupId: string;
  onAdd: () => void;
};

export function GroupExpensesSection({ groupId, onAdd }: GroupExpensesSectionProps) {
  const toast = useToast();
  const { pref } = useDateFormat();
  const { data: expenses, isPending, isError } = useGroupExpenses(groupId);
  const deleteExpense = useDeleteGroupExpense();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const confirmDelete = () => {
    if (!confirmingId) return;
    deleteExpense.mutate(
      { groupId, expenseId: confirmingId },
      {
        onSuccess: () => toast.success('Gasto borrado.'),
        onError: (error) => toast.error(groupErrorMessage(error)),
        onSettled: () => setConfirmingId(null),
      },
    );
  };

  return (
    <Card header={<h2 className="text-base font-semibold text-ink">Gastos</h2>}>
      {isPending && <Skeleton variant="list" rows={3} />}

      {isError && (
        <p role="alert" className="text-expense">
          No pudimos cargar los gastos del grupo.
        </p>
      )}

      {expenses && expenses.length === 0 && (
        <EmptyState
          title="Todavía no hay gastos."
          message="Cargá el primero y a cada uno le va a quedar anotada su parte."
          actionLabel="Nuevo gasto"
          onAction={onAdd}
        />
      )}

      {expenses && expenses.length > 0 && (
        <ul className="flex flex-col gap-3">
          {expenses.map((expense) => (
            <li key={expense.id} className="flex flex-wrap items-start justify-between gap-2 border-b border-line pb-3 last:border-b-0 last:pb-0">
              <div className="flex flex-col gap-1">
                <span className="text-ink">{expense.description ?? 'Gasto'}</span>
                <span className="text-sm text-muted">
                  {formatDate(expense.date, pref)} · Puso{' '}
                  {expense.payers.map((p) => p.displayName).join(', ')}
                </span>
                {/* Lo que importa de cada fila no es el total, es tu parte: es lo que te cuenta
                    en el mes y en el presupuesto. */}
                <span className="text-sm text-muted">
                  Te toca <Amount amount={expense.yourShare} currency={expense.currency} size="sm" tone="neutral" />
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Amount amount={expense.amount} currency={expense.currency} tone="expense" />
                <DeleteButton label={expense.description ?? 'el gasto'} onClick={() => setConfirmingId(expense.id)} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={confirmingId !== null}
        danger
        title="Borrar el gasto"
        message="Se borra para todos, y también la parte que se anotó en la cuenta de cada uno."
        confirmLabel="Borrar"
        loading={deleteExpense.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmingId(null)}
      />
    </Card>
  );
}
