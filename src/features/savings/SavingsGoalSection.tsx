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
import { useSavingsGoals } from './useSavingsGoals';
import { useDeleteSavingsGoal } from './useSavingsMutations';
import { savingsErrorMessage } from './errorMessages';
import { SavingsGoalForm } from './SavingsGoalForm';
import type { SavingsGoalResponse } from './api';

function formatDeadline(deadline: string): string {
  return new Date(deadline + 'T00:00:00').toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function isPastDeadline(deadline: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(deadline + 'T00:00:00') < today;
}

export function SavingsGoalSection() {
  const { data, isPending, isError } = useSavingsGoals();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SavingsGoalResponse | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const toast = useToast();
  const deleteMutation = useDeleteSavingsGoal();

  // Vacío: el CTA vive en el centro (EmptyState); escondemos el "Nuevo" de arriba a la
  // derecha para no duplicarlo. Con datos, el de arriba es el único.
  const isEmpty = !!data && data.length === 0;

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
      onSuccess: () => toast.success('Objetivo borrado.'),
      onError: (error) => toast.error(savingsErrorMessage(error)),
      onSettled: () => setConfirmingDeleteId(null),
    });
  };

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="m-0">Objetivos de ahorro</h2>
        {!isEmpty && (
          <Button type="button" size="sm" onClick={openCreate}>
            Nuevo
          </Button>
        )}
      </div>

      {isPending && <Skeleton variant="list" rows={3} />}

      {isError && (
        <p role="alert" className="text-expense">
          No pudimos cargar los objetivos de ahorro. Intentá de nuevo.
        </p>
      )}

      {data && data.length === 0 && (
        <EmptyState
          title="Todavía no tenés objetivos de ahorro."
          message="Creá un objetivo para ahorrar hacia una meta y seguí el progreso acá."
          actionLabel="Nuevo objetivo"
          onAction={openCreate}
        />
      )}

      {data && data.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {data.map((goal) => {
            const completed = goal.currentAmount >= goal.targetAmount;
            const ratio = goal.targetAmount > 0 ? goal.currentAmount / goal.targetAmount : 0;
            const past = goal.deadline ? isPastDeadline(goal.deadline) : false;

            return (
              <li key={goal.id}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-ink">{goal.name}</span>
                  <span className="flex items-center gap-2">
                    {completed ? (
                      <span className="shrink-0 whitespace-nowrap text-sm text-income">
                        Completado
                      </span>
                    ) : (
                      goal.deadline && (
                        <span
                          className={`shrink-0 whitespace-nowrap text-sm ${past ? 'text-expense' : 'text-body'}`}
                        >
                          {formatDeadline(goal.deadline)}
                        </span>
                      )
                    )}
                    <EditButton
                      label={`objetivo ${goal.name}`}
                      onClick={() => {
                        setEditing(goal);
                        setFormOpen(true);
                      }}
                    />
                  </span>
                </div>
                <ProgressBar
                  ratio={ratio}
                  tone={completed ? 'income' : 'brand'}
                  label={'Objetivo ' + goal.name}
                />
                <p className="text-sm tabular-nums text-body">
                  {formatMoney(goal.currentAmount, goal.currency)} de{' '}
                  {formatMoney(goal.targetAmount, goal.currency)}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editing ? 'Editar objetivo' : 'Nuevo objetivo'}
      >
        <SavingsGoalForm
          key={editing?.id ?? 'new'}
          goal={editing ?? undefined}
          onClose={closeForm}
          onDelete={
            editing
              ? () => {
                  const id = editing.id;
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
        title="Borrar objetivo"
        message="Esta acción no se puede deshacer."
        confirmLabel="Borrar"
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmingDeleteId(null)}
      />
    </Card>
  );
}
