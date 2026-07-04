import { useState } from 'react';
import { usePaymentMethods } from './usePaymentMethods';
import { useDeletePaymentMethod } from './usePaymentMethodMutations';
import { paymentMethodErrorMessage } from './errorMessages';
import { PaymentMethodForm } from './PaymentMethodForm';
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

  const { data: paymentMethods, isPending, isError } = usePaymentMethods();
  const deleteMutation = useDeletePaymentMethod();

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const startEdit = (pm: PaymentMethod) => {
    setEditing(pm);
    setFormOpen(true);
  };

  const confirmDelete = (id: string) => {
    deleteMutation.mutate(id, { onSuccess: () => setConfirmingDeleteId(null) });
  };

  return (
    <section>
      <h1>Métodos de pago</h1>

      {!formOpen && (
        <button type="button" onClick={() => setFormOpen(true)}>
          Nuevo método de pago
        </button>
      )}

      {formOpen && (
        <PaymentMethodForm
          key={editing?.id ?? 'new'}
          paymentMethod={editing ?? undefined}
          onClose={closeForm}
        />
      )}

      {isPending && <p>Cargando métodos de pago...</p>}

      {isError && <p role="alert">No pudimos cargar los métodos de pago. Intentá de nuevo.</p>}

      {deleteMutation.isError && (
        <p role="alert">{paymentMethodErrorMessage(deleteMutation.error)}</p>
      )}

      {paymentMethods && paymentMethods.length === 0 && (
        <p>No hay métodos de pago todavía. Creá el primero.</p>
      )}

      {paymentMethods && paymentMethods.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Por defecto</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {paymentMethods.map((pm) => (
              <tr key={pm.id}>
                <td>{pm.name}</td>
                <td>{TYPE_LABELS[pm.type]}</td>
                <td>{pm.isDefault ? '★ Sí' : '—'}</td>
                <td>
                  {confirmingDeleteId === pm.id ? (
                    <>
                      ¿Borrar?{' '}
                      <button
                        type="button"
                        onClick={() => confirmDelete(pm.id)}
                        disabled={deleteMutation.isPending}
                      >
                        Sí
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingDeleteId(null)}
                        disabled={deleteMutation.isPending}
                      >
                        No
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => startEdit(pm)}>
                        Editar
                      </button>
                      <button type="button" onClick={() => setConfirmingDeleteId(pm.id)}>
                        Borrar
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
