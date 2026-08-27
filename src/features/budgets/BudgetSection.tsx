import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { EditButton } from '../../components/ui/ActionsMenu';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/toastContext';
import { formatMoney } from '../../lib/money';
import { budgetStatus, type BudgetProgress } from './api';
import { useBudgetsSummary } from './useBudgetsSummary';
import { useDeleteBudget } from './useBudgetMutations';
import { budgetErrorMessage } from './errorMessages';
import { BudgetForm } from './BudgetForm';

const STATUS_LABEL: Record<'ok' | 'warning' | 'exceeded', string> = {
  ok: 'En presupuesto',
  warning: 'Cerca del límite',
  exceeded: 'Excedido',
};

const STATUS_CLASSES: Record<'ok' | 'warning' | 'exceeded', string> = {
  ok: 'text-body',
  warning: 'text-warning',
  exceeded: 'text-expense',
};

const STATUS_TONE: Record<'ok' | 'warning' | 'exceeded', 'brand' | 'warning' | 'expense'> = {
  ok: 'brand',
  warning: 'warning',
  exceeded: 'expense',
};

export function BudgetSection() {
  const { data, isPending, isError } = useBudgetsSummary();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BudgetProgress | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const toast = useToast();
  const deleteMutation = useDeleteBudget();

  // Vacío: el CTA vive en el centro (EmptyState); escondemos el "Nuevo" de arriba a la
  // derecha para no duplicarlo. Con datos, el de arriba es el único.
  const isEmpty = !!data && data.budgets.length === 0;

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };
  const confirmDelete = () => {
    if (!confirmingDeleteId) return;
    deleteMutation.mutate(confirmingDeleteId, {
      onSuccess: () => toast.success('Presupuesto borrado.'),
      onError: (error) => toast.error(budgetErrorMessage(error)),
      onSettled: () => setConfirmingDeleteId(null),
    });
  };

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="m-0">Presupuestos del mes</h2>
        {!isEmpty && (
          // secondary: es la acción de UNA card en una página sin acción primaria propia; dos
          // "Nuevo" rellenos lado a lado (con Objetivos) competían. El CTA primario queda para
          // el EmptyState, que es la única acción de la card vacía.
          <Button type="button" size="sm" variant="secondary" onClick={openCreate}>
            Nuevo
          </Button>
        )}
      </div>

      {isPending && <Skeleton variant="list" rows={3} />}

      {isError && (
        <p role="alert" className="text-expense">
          No pudimos cargar los presupuestos. Intentá de nuevo.
        </p>
      )}

      {data && data.budgets.length === 0 && (
        <EmptyState
          title="No definiste presupuestos este mes."
          message="Definí un límite por categoría para hacerle seguimiento acá."
          actionLabel="Nuevo presupuesto"
          onAction={openCreate}
        />
      )}

      {data && data.budgets.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {data.budgets.map((budget) => {
            const status = budgetStatus(budget.spentAmount, budget.limitAmount);
            const ratio = budget.limitAmount > 0 ? budget.spentAmount / budget.limitAmount : 0;
            const markerRatio =
              budget.limitAmount > 0 ? budget.projectedEndOfMonth / budget.limitAmount : 0;
            const dayOfMonth = new Date().getDate();
            const isAlarm = budget.projectedStatus === 'will_exceed' && dayOfMonth >= 7;

            return (
              <li key={budget.budgetId}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-ink">{budget.categoryName}</span>
                  <span className="flex items-center gap-2">
                    <span
                      className={`shrink-0 whitespace-nowrap text-sm ${STATUS_CLASSES[status]}`}
                    >
                      {STATUS_LABEL[status]}
                    </span>
                    <EditButton
                      label={`presupuesto de ${budget.categoryName}`}
                      onClick={() => {
                        setEditing(budget);
                        setFormOpen(true);
                      }}
                    />
                  </span>
                </div>
                <ProgressBar
                  ratio={ratio}
                  tone={STATUS_TONE[status]}
                  label={'Presupuesto ' + budget.categoryName}
                  markerRatio={markerRatio}
                />
                <p className="text-sm tabular-nums text-body">
                  {formatMoney(budget.spentAmount, budget.currency)} de{' '}
                  {formatMoney(budget.limitAmount, budget.currency)}
                </p>
                <p className={`text-sm tabular-nums ${isAlarm ? 'text-expense' : 'text-body'}`}>
                  Proyección fin de mes: {formatMoney(budget.projectedEndOfMonth, budget.currency)}
                  {isAlarm && ' · va a excederse'}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editing ? 'Editar presupuesto' : 'Nuevo presupuesto'}
      >
        <BudgetForm
          key={editing?.budgetId ?? 'new'}
          budget={editing ?? undefined}
          onClose={closeForm}
          onDelete={
            editing
              ? () => {
                  const id = editing.budgetId;
                  closeForm();
                  setConfirmingDeleteId(id);
                }
              : undefined
          }
        />
      </Modal>

      <ConfirmDialog
        open={confirmingDeleteId !== null}
        danger
        title="Borrar presupuesto"
        message="Esta acción no se puede deshacer."
        confirmLabel="Borrar"
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmingDeleteId(null)}
      />
    </Card>
  );
}
