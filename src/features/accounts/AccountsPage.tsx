import { useState } from 'react';
import { useAccounts } from './useAccounts';
import { useDeleteAccount } from './useAccountMutations';
import { accountErrorMessage } from './errorMessages';
import { AccountForm } from './AccountForm';
import { AccountCard } from './AccountCard';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/toastContext';
import type { Account } from './api';

export function AccountsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const toast = useToast();
  const { data: accounts, isPending, isError } = useAccounts();
  const deleteMutation = useDeleteAccount();

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

  return (
    <section className="flex flex-col gap-4 text-left">
      <h1>Cuentas</h1>

      {isPending && <Skeleton variant="list" rows={3} />}

      {isError && (
        <p role="alert" className="text-expense">
          No pudimos cargar las cuentas. Intentá de nuevo.
        </p>
      )}

      {accounts && accounts.length === 0 && (
        <EmptyState
          title="Todavía no tenés cuentas."
          message="Creá la primera para empezar a registrar transacciones."
          actionLabel="Nueva cuenta"
          onAction={openCreate}
        />
      )}

      {accounts && accounts.length > 0 && (
        <>
          <div className="flex flex-col gap-4">
            {accounts.map((account) => (
              <AccountCard key={account.id} account={account} onEdit={() => openEdit(account)} />
            ))}
          </div>

          <div className="flex justify-center pt-2">
            <Button type="button" onClick={openCreate}>
              Nueva cuenta
            </Button>
          </div>
        </>
      )}

      <Modal open={formOpen} onClose={closeForm} title={editing ? 'Editar cuenta' : 'Nueva cuenta'}>
        <AccountForm
          key={editing?.id ?? 'new'}
          account={editing ?? undefined}
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
        title="Borrar cuenta"
        message="Esta acción no se puede deshacer."
        confirmLabel="Borrar"
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmingDeleteId(null)}
      />
    </section>
  );
}
