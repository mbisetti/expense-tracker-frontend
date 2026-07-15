import { useEffect, useState, type FormEvent } from 'react';
import { Card } from '../../components/Card';
import { formatMoney } from '../../lib/money';
import { useAccounts } from '../accounts/useAccounts';
import { useCreateTransfer } from './useTransferMutations';
import { useExchangeRate } from './useExchangeRate';
import { transferErrorMessage } from './errorMessages';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

type TransferFormProps = {
  initialToAccountId?: string;
};

export function TransferForm({ initialToAccountId }: TransferFormProps = {}) {
  const { data: accounts } = useAccounts();
  const mutation = useCreateTransfer();

  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState(initialToAccountId ?? '');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [toAmountTouched, setToAmountTouched] = useState(false);
  const [date, setDate] = useState(todayIso());
  const [description, setDescription] = useState('');

  const fromAccount = accounts?.find((a) => a.id === fromAccountId);
  const toAccount = accounts?.find((a) => a.id === toAccountId);
  const crossCurrency = !!fromAccount && !!toAccount && fromAccount.currency !== toAccount.currency;

  const { data: rate } = useExchangeRate(
    crossCurrency ? fromAccount!.currency : undefined,
    crossCurrency ? toAccount!.currency : undefined,
  );

  // Pre-llena el monto de destino con la cotización sugerida, salvo que el usuario lo
  // haya editado: el monto real lo pone el usuario (el rate es sugerencia, no verdad).
  useEffect(() => {
    if (crossCurrency && rate?.rate && !toAmountTouched && fromAmount) {
      setToAmount(round2(Number(fromAmount) * rate.rate).toString());
    }
  }, [crossCurrency, rate, fromAmount, toAmountTouched]);

  // El destino puede ser cualquier otra cuenta (cross-currency habilitado en Sprint 15).
  const toOptions = (accounts ?? []).filter((a) => a.id !== fromAccountId);

  const handleFromChange = (id: string) => {
    setFromAccountId(id);
    setToAmountTouched(false);
    if (toAccountId === id) setToAccountId('');
  };

  const handleToChange = (id: string) => {
    setToAccountId(id);
    setToAmountTouched(false);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const from = Number(fromAmount);
    const to = crossCurrency ? Number(toAmount) : from;
    mutation.mutate(
      {
        fromAccountId,
        toAccountId,
        fromAmount: from,
        toAmount: to,
        date,
        description: description || undefined,
      },
      {
        onSuccess: () => {
          setFromAmount('');
          setToAmount('');
          setToAmountTouched(false);
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
            onChange={(e) => handleToChange(e.target.value)}
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

          <label htmlFor="transfer-from-amount">
            {crossCurrency ? `Monto a debitar (${fromAccount!.currency})` : 'Monto'}
          </label>
          <input
            id="transfer-from-amount"
            type="number"
            min="0.01"
            step="0.01"
            value={fromAmount}
            onChange={(e) => setFromAmount(e.target.value)}
            required
            disabled={mutation.isPending}
          />

          {crossCurrency && (
            <>
              <label htmlFor="transfer-to-amount">Monto a acreditar ({toAccount!.currency})</label>
              <input
                id="transfer-to-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={toAmount}
                onChange={(e) => {
                  setToAmount(e.target.value);
                  setToAmountTouched(true);
                }}
                required
                disabled={mutation.isPending}
              />
              <p className="text-body text-sm">
                {rate?.unavailable
                  ? 'Cotización no disponible — ingresá el monto de destino a mano.'
                  : rate?.rate
                    ? `Cotización sugerida: 1 ${fromAccount!.currency} ≈ ${rate.rate} ${toAccount!.currency} (editable).`
                    : 'Buscando cotización...'}
              </p>
            </>
          )}

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
