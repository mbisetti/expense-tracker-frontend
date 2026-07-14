import { useState, type FormEvent } from 'react';
import { Card } from '../../components/Card';
import { formatMoney } from '../../lib/money';
import { useAccounts } from '../accounts/useAccounts';
import { useCreateTransfer } from './useTransferMutations';
import { transferErrorMessage } from './errorMessages';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function TransferForm() {
  const { data: accounts } = useAccounts();
  const mutation = useCreateTransfer();

  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayIso());
  const [description, setDescription] = useState('');

  const fromAccount = accounts?.find((a) => a.id === fromAccountId);
  const toAccount = accounts?.find((a) => a.id === toAccountId);

  // MVP misma moneda: el destino se limita a cuentas de la misma moneda que el
  // origen y distintas de él → SAME_ACCOUNT_TRANSFER y CROSS_CURRENCY_NOT_SUPPORTED
  // quedan inalcanzables desde la UI (el backend los valida igual — defensa en
  // profundidad, mismo criterio que income excluyendo fuentes inactivas del select).
  const toOptions = (accounts ?? []).filter(
    (a) => a.id !== fromAccountId && (!fromAccount || a.currency === fromAccount.currency),
  );

  const handleFromChange = (id: string) => {
    setFromAccountId(id);
    // si el destino elegido dejó de ser válido (misma cuenta o distinta moneda), lo limpio
    const newFrom = accounts?.find((a) => a.id === id);
    const currentTo = accounts?.find((a) => a.id === toAccountId);
    const toStillValid =
      currentTo && currentTo.id !== id && (!newFrom || currentTo.currency === newFrom.currency);
    if (!toStillValid) setToAccountId('');
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    mutation.mutate(
      {
        fromAccountId,
        toAccountId,
        amount: Number(amount),
        date,
        description: description || undefined,
      },
      {
        onSuccess: () => {
          // se retiene origen/destino/fecha para cargar varias seguidas; se limpia
          // lo que cambia entre transferencias (monto, descripción)
          setAmount('');
          setDescription('');
        },
      },
    );
  };

  const hasTwoAccounts = (accounts?.length ?? 0) >= 2;

  return (
    <Card>
      <h2>Nueva transferencia</h2>

      {!hasTwoAccounts ? (
        <p>Necesitás al menos dos cuentas para transferir.</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <label htmlFor="transfer-from">Cuenta origen</label>
          <select
            id="transfer-from"
            value={fromAccountId}
            onChange={(e) => handleFromChange(e.target.value)}
            required
            disabled={mutation.isPending}
          >
            <option value="">Elegí una cuenta</option>
            {accounts?.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.currency})
              </option>
            ))}
          </select>

          <label htmlFor="transfer-to">Cuenta destino</label>
          <select
            id="transfer-to"
            value={toAccountId}
            onChange={(e) => setToAccountId(e.target.value)}
            required
            disabled={mutation.isPending || !fromAccountId}
          >
            <option value="">{fromAccountId ? 'Elegí una cuenta' : 'Elegí primero el origen'}</option>
            {toOptions.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.currency})
              </option>
            ))}
          </select>
          {fromAccountId && toOptions.length === 0 && (
            <p className="text-body text-sm">
              No tenés otra cuenta en {fromAccount?.currency} para transferir.
            </p>
          )}

          <label htmlFor="transfer-amount">Monto</label>
          <input
            id="transfer-amount"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            disabled={mutation.isPending}
          />

          <label htmlFor="transfer-date">Fecha</label>
          <input
            id="transfer-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            disabled={mutation.isPending}
          />

          <label htmlFor="transfer-description">Descripción (opcional)</label>
          <input
            id="transfer-description"
            type="text"
            maxLength={500}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={mutation.isPending}
          />

          {mutation.isError && <p role="alert">{transferErrorMessage(mutation.error)}</p>}

          {mutation.isSuccess && fromAccount && toAccount && (
            <p className="text-income">
              Transferencia realizada. Nuevo saldo — {fromAccount.name}:{' '}
              {formatMoney(mutation.data.fromAccountBalance, fromAccount.currency)} · {toAccount.name}:{' '}
              {formatMoney(mutation.data.toAccountBalance, toAccount.currency)}
            </p>
          )}

          <button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Transfiriendo...' : 'Transferir'}
          </button>
        </form>
      )}
    </Card>
  );
}
