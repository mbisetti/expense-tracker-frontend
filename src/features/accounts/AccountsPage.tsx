import { useState } from 'react';
import { useAccounts } from './useAccounts';
import { usePaymentMethods } from '../paymentMethods/usePaymentMethods';
import { useDeletePaymentMethod } from '../paymentMethods/usePaymentMethodMutations';
import { paymentMethodErrorMessage } from '../paymentMethods/errorMessages';
import { PaymentMethodForm } from '../paymentMethods/PaymentMethodForm';
import { useDeleteAccount } from './useAccountMutations';
import { accountErrorMessage } from './errorMessages';
import { AccountForm } from './AccountForm';
import { CardForm } from './CardForm';
import { AccountCardBody } from './AccountCardBody';
import { ReorderAccountsModal } from './ReorderAccountsModal';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { DotsVerticalIcon } from '../../components/ui/icons';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/toastContext';
import type { PaymentMethod } from '../paymentMethods/api';
import type { Account } from './api';

type AccountGroup = { key: string; institution: string | null; accounts: Account[] };

// Sprint 22.2 (D4): agrupa las cuentas top-level por institución preservando el orden del
// primer miembro en la lista del backend. Sin institución → grupo propio (una card).
function buildGroups(topLevel: Account[]): AccountGroup[] {
  const groups: AccountGroup[] = [];
  const byInstitution = new Map<string, number>();
  for (const account of topLevel) {
    const institution = account.institution ?? null;
    if (institution && byInstitution.has(institution)) {
      groups[byInstitution.get(institution)!].accounts.push(account);
    } else {
      if (institution) byInstitution.set(institution, groups.length);
      groups.push({
        key: institution ? `inst:${institution}` : account.id,
        institution,
        accounts: [account],
      });
    }
  }
  return groups;
}

export function AccountsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  // Alta de tarjeta desde el bloque de una cuenta banco/billetera (D9).
  const [cardFormFor, setCardFormFor] = useState<Account | null>(null);
  // Editar una tarjeta de débito (PaymentMethod) desde la gestión del bloque.
  const [editingPm, setEditingPm] = useState<PaymentMethod | null>(null);
  const [confirmingDeletePmId, setConfirmingDeletePmId] = useState<string | null>(null);
  const [reorderOpen, setReorderOpen] = useState(false);

  const toast = useToast();
  const { data: accounts, isPending, isError } = useAccounts();
  // UN solo GET /payment-methods a nivel página (D5/§7.2): la sección tarjetas filtra
  // client-side por cuenta y tipo (evita el N+1 de un fetch por bloque).
  const { data: paymentMethods } = usePaymentMethods();
  const deleteMutation = useDeleteAccount();
  const deletePmMutation = useDeletePaymentMethod();

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (account: Account) => {
    setEditing(account);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const confirmDelete = () => {
    if (!confirmingDeleteId) return;
    deleteMutation.mutate(confirmingDeleteId, {
      onSuccess: () => toast.success('Cuenta borrada.'),
      onError: (error) => toast.error(accountErrorMessage(error)),
      onSettled: () => setConfirmingDeleteId(null),
    });
  };

  const confirmDeletePm = () => {
    if (!confirmingDeletePmId) return;
    deletePmMutation.mutate(confirmingDeletePmId, {
      onSuccess: () => toast.success('Tarjeta borrada.'),
      onError: (error) => toast.error(paymentMethodErrorMessage(error)),
      onSettled: () => setConfirmingDeletePmId(null),
    });
  };

  // Top-level = todas salvo las CREDIT vinculadas (esas se muestran dentro de su madre, D7).
  const allAccounts = accounts ?? [];
  const topLevel = allAccounts.filter((a) => !(a.type === 'CREDIT' && a.linkedAccountId));
  const groups = buildGroups(topLevel);

  // Datos de gestión de tarjetas del bloque en edición (BANK/WALLET): se pasan al form.
  const editingIsBankLike = editing?.type === 'BANK' || editing?.type === 'WALLET';
  const editingCards =
    editing && editingIsBankLike
      ? {
          debitPms: (paymentMethods ?? []).filter(
            (pm) => pm.accountId === editing.id && (pm.type === 'DEBIT' || pm.type === 'CREDIT'),
          ),
          creditChildren: allAccounts.filter(
            (a) => a.type === 'CREDIT' && a.linkedAccountId === editing.id,
          ),
          onAddCard: () => {
            const parent = editing;
            closeForm();
            setCardFormFor(parent);
          },
          onEditChild: (child: Account) => setEditing(child),
          onEditDebit: (pm: PaymentMethod) => {
            closeForm();
            setEditingPm(pm);
          },
        }
      : undefined;

  return (
    <section className="flex flex-col gap-4 text-left">
      <div className="flex items-center justify-between gap-2">
        <h1>Cuentas</h1>
        {topLevel.length > 1 && (
          <button
            type="button"
            aria-label="Ordenar cuentas"
            onClick={() => setReorderOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted transition-colors hover:bg-brand-bg hover:text-ink"
          >
            <DotsVerticalIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {isPending && <Skeleton variant="list" rows={3} />}

      {isError && (
        <p role="alert" className="text-expense">
          No pudimos cargar las cuentas. Intentá de nuevo.
        </p>
      )}

      {accounts && topLevel.length === 0 && (
        <EmptyState
          title="Todavía no tenés cuentas."
          message="Creá la primera para empezar a registrar transacciones."
          actionLabel="Nueva cuenta"
          onAction={openCreate}
        />
      )}

      {accounts && topLevel.length > 0 && (
        <>
          <div className="flex flex-col gap-4">
            {groups.map((group) => {
              const showHeader = group.institution && group.accounts.length >= 2;
              return (
                <Card key={group.key}>
                  {showHeader && (
                    <div className="mb-3 text-base font-semibold text-ink">{group.institution}</div>
                  )}
                  <div className="flex flex-col">
                    {group.accounts.map((account, i) => (
                      <div key={account.id} className={i > 0 ? 'mt-4 border-t border-line pt-4' : ''}>
                        <AccountCardBody
                          account={account}
                          allAccounts={allAccounts}
                          paymentMethods={paymentMethods ?? []}
                          onEdit={() => openEdit(account)}
                          onAddCard={() => setCardFormFor(account)}
                        />
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="flex justify-center pt-2">
            <Button type="button" onClick={openCreate}>
              Nueva cuenta
            </Button>
          </div>
        </>
      )}

      <ReorderAccountsModal
        open={reorderOpen}
        accounts={topLevel}
        onClose={() => setReorderOpen(false)}
      />

      <Modal open={formOpen} onClose={closeForm} title={editing ? 'Editar cuenta' : 'Nueva cuenta'}>
        <AccountForm
          key={editing?.id ?? 'new'}
          account={editing ?? undefined}
          accounts={allAccounts}
          manageCards={editingCards}
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

      <Modal
        open={cardFormFor !== null}
        onClose={() => setCardFormFor(null)}
        title="Agregar tarjeta"
      >
        {cardFormFor && <CardForm account={cardFormFor} onClose={() => setCardFormFor(null)} />}
      </Modal>

      <Modal
        open={editingPm !== null}
        onClose={() => setEditingPm(null)}
        title="Editar tarjeta de débito"
      >
        {editingPm && (
          <PaymentMethodForm
            paymentMethod={editingPm}
            onClose={() => setEditingPm(null)}
            onDelete={() => {
              const id = editingPm.id;
              setEditingPm(null);
              setConfirmingDeletePmId(id);
            }}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={confirmingDeleteId !== null}
        danger
        title="Borrar cuenta"
        message="Esta acción no se puede deshacer."
        confirmLabel="Borrar"
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmingDeleteId(null)}
      />

      <ConfirmDialog
        open={confirmingDeletePmId !== null}
        danger
        title="Borrar tarjeta"
        message="Esta acción no se puede deshacer."
        confirmLabel="Borrar"
        loading={deletePmMutation.isPending}
        onConfirm={confirmDeletePm}
        onCancel={() => setConfirmingDeletePmId(null)}
      />
    </section>
  );
}
