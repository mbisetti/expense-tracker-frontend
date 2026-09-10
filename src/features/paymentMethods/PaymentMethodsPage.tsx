import { useState } from 'react';
import { usePaymentMethods } from './usePaymentMethods';
import { useDeletePaymentMethod, useSetDefaultMethod } from './usePaymentMethodMutations';
import { paymentMethodErrorMessage } from './errorMessages';
import { PaymentMethodForm } from './PaymentMethodForm';
import { useAccounts } from '../accounts/useAccounts';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { Modal } from '../../components/ui/Modal';
import { EditButton } from '../../components/ui/ActionsMenu';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/toastContext';
import type { Account } from '../accounts/api';
import type { PaymentMethod, PaymentMethodType } from './api';

const TYPE_LABELS: Record<PaymentMethodType, string> = {
  CASH: 'Efectivo',
  DEBIT: 'Débito',
  CREDIT: 'Crédito',
  DIGITAL_WALLET: 'Billetera digital',
  TRANSFER: 'Transferencia',
};

/**
 * S50 (D3): los métodos de pago, seccionados por cuenta.
 *
 * Antes era una tabla plana con una columna "Cuenta", que era el síntoma: si tenés una columna
 * "Cuenta" es porque la lista tenía que estar agrupada por cuenta. Cada sección muestra los
 * métodos de esa cuenta, sus tarjetas vinculadas, y el radio que elige el PREDETERMINADO, que es
 * con el que arrancan los formularios de transacción.
 */
export function PaymentMethodsPage() {
  const [formFor, setFormFor] = useState<{ accountId: string } | null>(null);
  const [editing, setEditing] = useState<PaymentMethod | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const toast = useToast();
  const { data: paymentMethods, isPending, isError } = usePaymentMethods();
  const { data: accounts } = useAccounts();
  const deleteMutation = useDeletePaymentMethod();
  const setDefault = useSetDefaultMethod();

  /**
   * Las mismas cuentas que ofrece el selector "Cuenta" del formulario de transacción, menos las
   * cuentas sistema. Así lo que ves acá es exactamente lo que vas a poder elegir al cargar.
   *
   * - Las CREDIT vinculadas no tienen sección propia: aparecen DENTRO de su madre, porque una
   *   tarjeta vinculada ES el método (una tx ruteada a ella va sin paymentMethodId).
   * - Las cuentas sistema ("Deudas con amigos", S40 D7) tampoco: a esa no se le paga con nada,
   *   se le transfiere.
   */
  const sectionAccounts = (accounts ?? []).filter(
    (a) => !(a.type === 'CREDIT' && a.linkedAccountId) && !a.systemRole,
  );

  const methodsOf = (accountId: string) =>
    (paymentMethods ?? []).filter((pm) => pm.accountId === accountId);

  const cardsOf = (accountId: string) =>
    (accounts ?? []).filter((a) => a.type === 'CREDIT' && a.linkedAccountId === accountId);

  const closeForm = () => {
    setFormFor(null);
    setEditing(null);
  };

  const chooseDefault = (
    account: Account,
    choice: { paymentMethodId?: string; cardAccountId?: string },
  ) => {
    setDefault.mutate(
      { accountId: account.id, ...choice },
      {
        onSuccess: () =>
          toast.success(
            choice.paymentMethodId || choice.cardAccountId
              ? `Listo, es el método por defecto de ${account.name}.`
              : `${account.name} quedó sin método por defecto.`,
          ),
        onError: (error) => toast.error(paymentMethodErrorMessage(error)),
      },
    );
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
      <PageHeader title="Métodos de pago" />

      {isPending && <Skeleton variant="list" rows={4} />}

      {isError && (
        <p role="alert" className="text-expense">
          No pudimos cargar los métodos de pago. Intentá de nuevo.
        </p>
      )}

      {!isPending && !isError && sectionAccounts.length === 0 && (
        <EmptyState
          title="No hay cuentas todavía."
          message="Creá una cuenta y sus métodos de pago aparecen acá."
        />
      )}

      {!isPending &&
        !isError &&
        sectionAccounts.map((account) => {
          const methods = methodsOf(account.id);
          const cards = cardsOf(account.id);
          const hasDefault = Boolean(account.defaultPaymentMethodId || account.defaultCardAccountId);

          return (
            <section
              key={account.id}
              aria-label={account.name}
              className="flex flex-col gap-2 rounded-md border border-line bg-surface p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="m-0 text-sm font-medium text-ink">{account.name}</h2>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setEditing(null);
                    setFormFor({ accountId: account.id });
                  }}
                >
                  Agregar método
                </Button>
              </div>

              <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
                {/* Sin esta fila no hay forma de SACAR un predeterminado. */}
                <li className="py-2 first:pt-0">
                  <label className="flex items-center gap-2 text-sm text-body">
                    <input
                      type="radio"
                      name={`default-${account.id}`}
                      checked={!hasDefault}
                      onChange={() => chooseDefault(account, {})}
                      className="h-4 w-4 accent-brand"
                    />
                    Ninguno
                  </label>
                </li>

                {methods.map((pm) => (
                  <li key={pm.id} className="flex items-center justify-between gap-3 py-2">
                    <label className="flex items-center gap-2 text-sm text-body">
                      <input
                        type="radio"
                        name={`default-${account.id}`}
                        checked={account.defaultPaymentMethodId === pm.id}
                        onChange={() => chooseDefault(account, { paymentMethodId: pm.id })}
                        className="h-4 w-4 accent-brand"
                      />
                      <span className="text-ink">{pm.name}</span>
                      <span className="text-muted">{TYPE_LABELS[pm.type]}</span>
                    </label>
                    <EditButton
                      label={pm.name}
                      onClick={() => {
                        setEditing(pm);
                        setFormFor({ accountId: account.id });
                      }}
                    />
                  </li>
                ))}

                {/* Las tarjetas vinculadas son CUENTAS: se editan en Cuentas, no acá. Por eso no
                    llevan lápiz. Elegirlas como predeterminado rutea la tx a la tarjeta. */}
                {cards.map((card) => (
                  <li key={card.id} className="flex items-center justify-between gap-3 py-2">
                    <label className="flex items-center gap-2 text-sm text-body">
                      <input
                        type="radio"
                        name={`default-${account.id}`}
                        checked={account.defaultCardAccountId === card.id}
                        onChange={() => chooseDefault(account, { cardAccountId: card.id })}
                        className="h-4 w-4 accent-brand"
                      />
                      <span className="text-ink">{card.name}</span>
                      <span className="text-muted">Tarjeta vinculada</span>
                    </label>
                  </li>
                ))}
              </ul>

              {methods.length === 0 && cards.length === 0 && (
                <p className="m-0 text-sm text-muted">Esta cuenta no tiene métodos todavía.</p>
              )}
            </section>
          );
        })}

      <Modal
        open={formFor !== null}
        onClose={closeForm}
        title={editing ? 'Editar método de pago' : 'Nuevo método de pago'}
      >
        {formFor && (
          <PaymentMethodForm
            key={editing?.id ?? `new-${formFor.accountId}`}
            paymentMethod={editing ?? undefined}
            accountId={formFor.accountId}
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
        )}
      </Modal>

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
