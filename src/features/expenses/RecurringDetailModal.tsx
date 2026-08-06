import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Amount } from '../../components/ui/Amount';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/toastContext';
import { useTransactions } from '../transactions/useTransactions';
import { useCategories } from '../categories/useCategories';
import { useAccounts } from '../accounts/useAccounts';
import { usePaymentMethods } from '../paymentMethods/usePaymentMethods';
import { formatDate, useDateFormat } from '../../lib/dateFormat';
import { formatMoney } from '../../lib/money';
import { transactionErrorMessage } from '../transactions/errorMessages';
import { useUpdateRecurringExpense, useDeleteRecurringExpense, useRetryDebits } from './useRecurringMutations';
import { autoDebitTargetLabel, dueLabel, financingCost, frequencyLabel, stateBadge } from './recurringFormat';
import type { RecurringExpense, RecurringItem } from './api';

type RecurringDetailModalProps = {
  recurring: RecurringExpense;
  /** Estado del mes pedido (solo para activos con datos del summary). */
  item?: RecurringItem;
  onClose: () => void;
  onEdit: (recurring: RecurringExpense) => void;
  /** Sólo en manuales con saldo del mes: abre el alta del pago (cierra este modal antes). */
  onPay?: () => void;
};

export function RecurringDetailModal({ recurring, item, onClose, onEdit, onPay }: RecurringDetailModalProps) {
  const { pref } = useDateFormat();
  const toast = useToast();
  const { data: categories } = useCategories();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const updateMutation = useUpdateRecurringExpense();
  const deleteMutation = useDeleteRecurringExpense();
  const retryMutation = useRetryDebits();

  // Sprint 24.4: nombres de la cuenta/método de débito (los ids viven en el recurrente).
  const { data: accounts } = useAccounts();
  const { data: debitPms } = usePaymentMethods(recurring.debitAccountId ?? undefined);
  const debitAccountName = accounts?.find((a) => a.id === recurring.debitAccountId)?.name;
  const debitMethodName = debitPms?.find((pm) => pm.id === recurring.debitPaymentMethodId)?.name;
  const failedCount = item?.failedCount ?? 0;

  const history = useTransactions({
    recurringExpenseId: recurring.id,
    size: 100,
    sort: 'date',
    direction: 'DESC',
  });

  const categoryName = categories?.find((c) => c.id === recurring.categoryId)?.name;
  const badge = item ? stateBadge(item) : null;
  const installmentsPaid = item?.installmentsPaid ?? history.data?.totalElements ?? 0;
  const financing = financingCost(recurring.amount, recurring.installmentsTotal, recurring.cashPrice);
  const rows = history.data?.content ?? [];

  const toggleActive = () => {
    updateMutation.mutate(
      { id: recurring.id, changes: { active: !recurring.active } },
      {
        onSuccess: () => {
          toast.success(recurring.active ? 'Gasto recurrente desactivado.' : 'Gasto recurrente activado.');
          onClose();
        },
        onError: (error) => toast.error(transactionErrorMessage(error)),
      },
    );
  };

  const doDelete = () => {
    deleteMutation.mutate(recurring.id, {
      onSuccess: () => {
        toast.success('Gasto recurrente borrado.');
        onClose();
      },
      onError: (error) => toast.error(transactionErrorMessage(error)),
    });
  };

  const doRetry = () => {
    retryMutation.mutate(recurring.id, {
      onSuccess: (result) => {
        if (result.stillFailed > 0) {
          toast.error(
            result.executed > 0
              ? `Se debitaron ${result.executed}; ${result.stillFailed} siguen sin saldo suficiente.`
              : 'No se pudo debitar: saldo insuficiente en la cuenta.',
          );
        } else {
          toast.success(result.executed > 0 ? 'Débito realizado.' : 'No había nada pendiente.');
        }
      },
      onError: (error) => toast.error(transactionErrorMessage(error)),
    });
  };

  const busy = updateMutation.isPending || deleteMutation.isPending || retryMutation.isPending;

  return (
    <Modal open onClose={onClose} title={recurring.name} disableClose={busy}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Amount amount={recurring.amount} currency={recurring.currency} tone="neutral" size="lg" />
          {badge && <Badge status={badge.status} label={badge.label} />}
          {!recurring.active && <Badge status="pending" label="Inactivo" />}
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted">Frecuencia</dt>
          <dd className="text-ink">{frequencyLabel(recurring.frequency)}</dd>
          <dt className="text-muted">Categoría</dt>
          <dd className="text-ink">{categoryName ?? '—'}</dd>
          <dt className="text-muted">Vencimiento</dt>
          <dd className="text-ink">{dueLabel(recurring) || '—'}</dd>
          {recurring.installmentsTotal != null && (
            <>
              <dt className="text-muted">Cuotas</dt>
              <dd className="text-ink">
                {Math.min(installmentsPaid, recurring.installmentsTotal)}/{recurring.installmentsTotal}
              </dd>
            </>
          )}
          {recurring.autoDebit && (
            <>
              <dt className="text-muted">Débito automático</dt>
              <dd className="text-ink">{autoDebitTargetLabel(debitAccountName, debitMethodName)}</dd>
            </>
          )}
        </dl>

        {failedCount > 0 && (
          <div className="flex flex-col gap-2 rounded-md bg-warning/10 p-3 text-sm">
            <p className="text-body">
              No se pudo debitar (saldo insuficiente){failedCount > 1 ? ` — ${failedCount} pendientes` : ''}.
            </p>
            <Button
              type="button"
              variant="secondary"
              onClick={doRetry}
              loading={retryMutation.isPending}
              disabled={updateMutation.isPending || deleteMutation.isPending}
            >
              Reintentar ahora
            </Button>
          </div>
        )}

        {financing && (
          <p className="rounded-md bg-surface-sunken p-3 text-sm text-body">
            Total en cuotas{' '}
            <span className="tabular-nums text-ink">{formatMoney(financing.totalInInstallments, recurring.currency)}</span>{' '}
            vs contado{' '}
            <span className="tabular-nums text-ink">{formatMoney(recurring.cashPrice!, recurring.currency)}</span> → +
            <span className="tabular-nums text-expense">{formatMoney(financing.diff, recurring.currency)}</span>{' '}
            (+{financing.pct}%)
          </p>
        )}

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-ink">Historial de pagos</h3>
          {history.isPending && <Skeleton variant="list" rows={3} />}
          {history.isError && (
            <p role="alert" className="text-expense">
              No pudimos cargar el historial.
            </p>
          )}
          {!history.isPending && !history.isError && rows.length === 0 && (
            <EmptyState title="Todavía no vinculaste ningún pago." />
          )}
          {rows.length > 0 && (
            <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
              {rows.map((tx) => (
                <li key={tx.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className="flex min-w-0 flex-col">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-ink">{tx.description ?? '—'}</span>
                      {tx.autoGenerated && <Badge status="info" label="Auto" />}
                    </span>
                    <span className="tabular-nums text-xs text-muted">{formatDate(tx.date, pref)}</span>
                  </div>
                  <Amount amount={tx.amount} currency={tx.currency} tone="expense" size="sm" />
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex flex-wrap gap-2">
          {onPay && (
            <Button type="button" onClick={onPay} disabled={busy}>
              Marcar pagado
            </Button>
          )}
          <Button type="button" variant={onPay ? 'secondary' : 'primary'} onClick={() => onEdit(recurring)} disabled={busy}>
            Editar
          </Button>
          <Button type="button" variant="secondary" onClick={toggleActive} loading={updateMutation.isPending} disabled={deleteMutation.isPending}>
            {recurring.active ? 'Desactivar' : 'Activar'}
          </Button>
          <Button type="button" variant="danger" onClick={() => setConfirmDelete(true)} disabled={busy}>
            Borrar
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Borrar gasto recurrente"
        message="El historial de pagos queda, pero se desvincula y no se puede re-vincular en lote. Para pausarlo sin perder el vínculo, mejor desactivalo."
        confirmLabel="Borrar"
        danger
        loading={deleteMutation.isPending}
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </Modal>
  );
}
