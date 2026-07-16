import { useState } from 'react';
import { usePaymentMethods } from './usePaymentMethods';
import { useDeletePaymentMethod } from './usePaymentMethodMutations';
import { paymentMethodErrorMessage } from './errorMessages';
import { PaymentMethodForm } from './PaymentMethodForm';
import { useAccounts } from '../accounts/useAccounts';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/toastContext';
import type { PaymentMethod, PaymentMethodType } from './api';

const TYPE_LABELS: Record<PaymentMethodType, string> = {
  CASH: 'Efectivo',
  DEBIT: 'Débito',
  CREDIT: 'Crédito',
  DIGITAL_WALLET: 'Billetera digital',
  TRANSFER: 'Transferencia',
};

export function PaymentMethodsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentMethod | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const toast = useToast();
  const { data: paymentMethods, isPending, isError } = usePaymentMethods();
  const { data: accounts } = useAccounts();
  const deleteMutation = useDeletePaymentMethod();

  const accountName = (id: string) => accounts?.find((a) => a.id === id)?.name ?? '—';

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const startEdit = (pm: PaymentMethod) => {
    setEditing(pm);
    setFormOpen(true);
  };

  const confirmDelete = () => {
    if (!confirmingDeleteId) return;
    deleteMutation.mutate(confirmingDeleteId, {
      onSuccess: () => toast.success('Método de pago borrado.'),
      onError: (error) => toast.error(paymentMethodErrorMessage(error)),
      onSettled: () => setConfirmingDeleteId(null),
    });
  };

  return (
    <section className="flex flex-col gap-4 text-left">
      <h1>Métodos de pago</h1>

      {!formOpen && (
        <Button type="button" onClick={() => setFormOpen(true)} className="self-start">
          Nuevo método de pago
        </Button>
      )}

      {formOpen && (
        <PaymentMethodForm
          key={editing?.id ?? 'new'}
          paymentMethod={editing ?? undefined}
          onClose={closeForm}
        />
      )}

      {isPending && <Skeleton variant="list" rows={4} />}

      {isError && (
        <p role="alert" className="text-expense">
          No pudimos cargar los métodos de pago. Intentá de nuevo.
        </p>
      )}

      {paymentMethods && paymentMethods.length === 0 && (
        <EmptyState title="No hay métodos de pago todavía." message="Creá el primero." />
      )}

      {paymentMethods && paymentMethods.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th className="py-2 pr-2 font-medium">Nombre</th>
                <th className="py-2 pr-2 font-medium">Cuenta</th>
                <th className="py-2 pr-2 font-medium">Tipo</th>
                <th className="py-2 pr-2 font-medium">Por defecto</th>
                <th className="py-2 pr-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {paymentMethods.map((pm) => (
                <tr key={pm.id} className="border-b border-line">
                  <td className="py-2 pr-2 text-ink">{pm.name}</td>
                  <td className="py-2 pr-2 text-body">{accountName(pm.accountId)}</td>
                  <td className="py-2 pr-2 text-body">{TYPE_LABELS[pm.type]}</td>
                  <td className="py-2 pr-2 text-body">{pm.isDefault ? '★ Sí' : '—'}</td>
                  <td className="py-2 pr-2">
                    <div className="flex gap-2">
                      <Button type="button" variant="ghost" size="sm" onClick={() => startEdit(pm)}>
                        Editar
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmingDeleteId(pm.id)}
                      >
                        Borrar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={confirmingDeleteId !== null}
        danger
        title="Borrar método de pago"
        message="Esta acción no se puede deshacer."
        confirmLabel="Borrar"
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmingDeleteId(null)}
      />
    </section>
  );
}
