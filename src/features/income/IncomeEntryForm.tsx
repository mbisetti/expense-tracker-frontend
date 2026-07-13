import { useState, type FormEvent } from 'react';
import { Card } from '../../components/Card';
import { formatMoney } from '../../lib/money';
import { useAccounts } from '../accounts/useAccounts';
import { useIncomeSources } from './useIncomeSources';
import { useCreateIncomeEntry } from './useIncomeMutations';
import { incomeErrorMessage } from './errorMessages';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function IncomeEntryForm() {
  const { data: sources } = useIncomeSources();
  const { data: accounts } = useAccounts();
  const mutation = useCreateIncomeEntry();

  const activeSources = sources?.filter((source) => source.active) ?? [];

  const [incomeSourceId, setIncomeSourceId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayIso());
  const [notes, setNotes] = useState('');

  const selectedAccount = accounts?.find((a) => a.id === accountId);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    mutation.mutate(
      {
        incomeSourceId,
        accountId,
        amount: Number(amount),
        date,
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          setAmount('');
          setNotes('');
        },
      },
    );
  };

  return (
    <Card>
      <h2>Registrar ingreso</h2>

      {activeSources.length === 0 ? (
        <p>Creá una fuente de ingreso activa para registrar ingresos.</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <label htmlFor="entry-source">Fuente</label>
          <select
            id="entry-source"
            value={incomeSourceId}
            onChange={(e) => setIncomeSourceId(e.target.value)}
            required
            disabled={mutation.isPending}
          >
            <option value="">Elegí una fuente</option>
            {activeSources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name} ({source.currency})
              </option>
            ))}
          </select>

          <label htmlFor="entry-account">Cuenta destino</label>
          <select
            id="entry-account"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
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

          <label htmlFor="entry-amount">Monto</label>
          <input
            id="entry-amount"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            disabled={mutation.isPending}
          />

          <label htmlFor="entry-date">Fecha</label>
          <input
            id="entry-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            disabled={mutation.isPending}
          />

          <label htmlFor="entry-notes">Descripción (opcional)</label>
          <input
            id="entry-notes"
            type="text"
            maxLength={500}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={mutation.isPending}
          />

          {mutation.isError && <p role="alert">{incomeErrorMessage(mutation.error)}</p>}

          {mutation.isSuccess && selectedAccount && (
            <p className="text-income">
              Ingreso registrado. Nuevo balance:{' '}
              {formatMoney(mutation.data.accountBalance, selectedAccount.currency)}
            </p>
          )}

          <button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Guardando...' : 'Guardar'}
          </button>
        </form>
      )}
    </Card>
  );
}
