import { useState } from 'react';
import { formatMoney } from '../../lib/money';
import { useAccounts } from './useAccounts';
import { useDeleteAccount } from './useAccountMutations';
import { accountErrorMessage } from './errorMessages';
import { AccountForm } from './AccountForm';
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

  const confirmDelete = (id: string) => {
    // onSettled: también en error, para que la fila no quede clavada en ¿Borrar? Sí/No
    deleteMutation.mutate(id, { onSettled: () => setConfirmingDeleteId(null) });
  };

  return (
    <section>
      <h1>Cuentas</h1>

      {!formOpen && (
        <button type="button" onClick={() => setFormOpen(true)}>
          Nueva cuenta
        </button>
      )}

      {formOpen && (
        <AccountForm
          key={editing?.id ?? 'new'}
          account={editing ?? undefined}
          onClose={closeForm}
        />
      )}

      {isPending && <p>Cargando cuentas...</p>}

      {isError && <p role="alert">No pudimos cargar las cuentas. Intentá de nuevo.</p>}

      {deleteMutation.isError && (
        <p role="alert">{accountErrorMessage(deleteMutation.error)}</p>
      )}

      {accounts && accounts.length === 0 && (
        <p>Todavía no tenés cuentas. Creá la primera para empezar a registrar transacciones.</p>
      )}

      {accounts && accounts.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Moneda</th>
              <th>Balance</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr key={account.id}>
                <td>{account.name}</td>
                <td>{TYPE_LABELS[account.type]}</td>
                <td>{account.currency}</td>
                <td>{formatMoney(account.balance, account.currency)}</td>
                <td>
                  {confirmingDeleteId === account.id ? (
                    <>
                      ¿Borrar?{' '}
                      <button
                        type="button"
                        onClick={() => confirmDelete(account.id)}
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
                      <button type="button" onClick={() => startEdit(account)}>
                        Editar
                      </button>
                      <button type="button" onClick={() => setConfirmingDeleteId(account.id)}>
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
