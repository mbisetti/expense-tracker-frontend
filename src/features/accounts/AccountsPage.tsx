import { useState } from 'react';
import { useAccounts } from './useAccounts';
import { useDeleteAccount } from './useAccountMutations';
import { accountErrorMessage } from './errorMessages';
import { AccountForm } from './AccountForm';
import { CreditCardStatement } from './CreditCardStatement';
import { Button } from '../../components/ui/Button';
import { Amount } from '../../components/ui/Amount';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/toastContext';
import type { Account, AccountType } from './api';

const TYPE_LABELS: Record<AccountType, string> = {
  CASH: 'Efectivo',
  DEBIT: 'Débito',
  CREDIT: 'Crédito',
};

export function AccountsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const toast = useToast();
  const { data: accounts, isPending, isError } = useAccounts();
  const deleteMutation = useDeleteAccount();

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const startEdit = (account: Account) => {
    setEditing(account);
    setFormOpen(true);
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

      {!formOpen && (
        <Button type="button" onClick={() => setFormOpen(true)} className="self-start">
          Nueva cuenta
        </Button>
      )}

      {formOpen && (
        <AccountForm
          key={editing?.id ?? 'new'}
          account={editing ?? undefined}
          onClose={closeForm}
        />
      )}

      {isPending && <Skeleton variant="list" rows={4} />}

      {isError && (
        <p role="alert" className="text-expense">
          No pudimos cargar las cuentas. Intentá de nuevo.
        </p>
      )}

      {accounts && accounts.length === 0 && (
        <EmptyState
          title="Todavía no tenés cuentas."
          message="Creá la primera para empezar a registrar transacciones."
        />
      )}

      {accounts && accounts.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th className="py-2 pr-2 font-medium">Nombre</th>
                <th className="py-2 pr-2 font-medium">Tipo</th>
                <th className="py-2 pr-2 font-medium">Moneda</th>
                <th className="py-2 pr-2 font-medium">Balance</th>
                <th className="py-2 pr-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id} className="border-b border-line">
                  <td className="py-2 pr-2 text-ink">
                    <span className="flex items-center gap-2">
                      {account.name}
                      {account.isInformal && <Badge status="info" label="Informal" />}
                    </span>
                  </td>
                  <td className="py-2 pr-2 text-body">{TYPE_LABELS[account.type]}</td>
                  <td className="py-2 pr-2 text-body">{account.currency}</td>
                  <td className="py-2 pr-2">
                    <Amount amount={account.balance} currency={account.currency} tone="neutral" size="sm" />
                  </td>
                  <td className="py-2 pr-2">
                    <div className="flex gap-2">
                      <Button type="button" variant="ghost" size="sm" onClick={() => startEdit(account)}>
                        Editar
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmingDeleteId(account.id)}
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

      {accounts && accounts.some((a) => a.type === 'CREDIT' && a.statementCloseDay != null) && (
        <section className="flex flex-col gap-4">
          <h2>Tarjetas de crédito</h2>
          {accounts
            .filter((a) => a.type === 'CREDIT' && a.statementCloseDay != null)
            .map((card) => (
              <CreditCardStatement key={card.id} account={card} />
            ))}
        </section>
      )}

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
