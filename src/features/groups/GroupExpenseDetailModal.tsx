import { useState } from 'react';
import { Amount } from '../../components/ui/Amount';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/toastContext';
import { groupErrorMessage } from './errorMessages';
import { useAddGroupComment, useDeleteGroupComment, useGroupComments } from './useGroupComments';
import type { GroupExpense } from './api';

type GroupExpenseDetailModalProps = {
  groupId: string;
  expense: GroupExpense | null;
  onClose: () => void;
};

// El detalle de un gasto: cómo quedó repartido y la conversación sobre él.
//
// Las dos cosas juntas y no en pantallas separadas a propósito: se comenta un gasto JUSTAMENTE
// para discutir el reparto, así que discutirlo sin verlo no tiene sentido.
export function GroupExpenseDetailModal({ groupId, expense, onClose }: GroupExpenseDetailModalProps) {
  const toast = useToast();
  const [body, setBody] = useState('');

  const { data: comments, isPending } = useGroupComments(groupId, expense?.id);
  const addComment = useAddGroupComment();
  const deleteComment = useDeleteGroupComment();

  if (!expense) return null;

  const submit = () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    addComment.mutate(
      { groupId, expenseId: expense.id, body: trimmed },
      {
        onSuccess: () => setBody(''),
        onError: (error) => toast.error(groupErrorMessage(error)),
      },
    );
  };

  return (
    <Modal open onClose={onClose} title={expense.description ?? 'Gasto'}>
      <div className="flex flex-col gap-4">
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-ink">Quién puso</h3>
          <ul className="flex flex-col gap-1">
            {expense.payers.map((payer) => (
              <li key={payer.memberId} className="flex justify-between text-sm">
                <span className="text-body">{payer.displayName}</span>
                <Amount amount={payer.amount} currency={expense.currency} size="sm" tone="neutral" />
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-ink">A quién le toca</h3>
          <ul className="flex flex-col gap-1">
            {expense.splits.map((split) => (
              <li key={split.memberId} className="flex justify-between text-sm">
                <span className="text-body">{split.displayName}</span>
                <Amount amount={split.amount} currency={expense.currency} size="sm" tone="neutral" />
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-3 border-t border-line pt-4">
          <h3 className="text-sm font-semibold text-ink">Comentarios</h3>

          {isPending && <Skeleton variant="list" rows={2} />}

          {comments && comments.length === 0 && (
            <p className="text-sm text-muted">Todavía nadie dijo nada.</p>
          )}

          {comments && comments.length > 0 && (
            <ul className="flex flex-col gap-2">
              {comments.map((comment) => (
                <li key={comment.id} className="flex flex-col gap-1">
                  <span className="text-sm text-ink">
                    <strong className="font-medium">{comment.authorName}</strong> {comment.body}
                  </span>
                  {comment.mine && (
                    <button
                      type="button"
                      className="self-start text-xs text-muted underline transition-colors duration-200 ease-out hover:text-expense"
                      onClick={() =>
                        deleteComment.mutate(
                          { groupId, expenseId: expense.id, commentId: comment.id },
                          { onError: (error) => toast.error(groupErrorMessage(error)) },
                        )
                      }
                    >
                      Borrar
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <div className="min-w-52 flex-1">
              <Input
                label="Escribir un comentario"
                value={body}
                maxLength={500}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>
            <Button type="submit" variant="secondary" loading={addComment.isPending} disabled={!body.trim()}>
              Comentar
            </Button>
          </form>
        </section>
      </div>
    </Modal>
  );
}
