import { useEffect, useState, type FormEvent } from 'react';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { DateField } from '../../components/ui/DateField';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/toastContext';
import { formatMoney, numberToAmountDisplay, parseAmountInput } from '../../lib/money';
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
  const toast = useToast();
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
  // (lint set-state-in-effect pre-existente — no tocado en esta migración, ver reporte S19 B3)
  useEffect(() => {
    if (crossCurrency && rate?.rate && !toAmountTouched && fromAmount) {
      setToAmount(numberToAmountDisplay(round2(parseAmountInput(fromAmount) * rate.rate)));
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
    const from = parseAmountInput(fromAmount);
    const to = crossCurrency ? parseAmountInput(toAmount) : from;
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
        onSuccess: (data) => {
          toast.success(
            `Transferencia realizada. Nuevo saldo — ${fromAccount!.name}: ${formatMoney(data.fromAccountBalance, fromAccount!.currency)} · ${toAccount!.name}: ${formatMoney(data.toAccountBalance, toAccount!.currency)}`,
          );
          setFromAmount('');
          setToAmount('');
          setToAmountTouched(false);
          setDescription('');
        },
        onError: (error) => toast.error(transferErrorMessage(error)),
      },
    );
  };

  const hasTwoAccounts = (accounts?.length ?? 0) >= 2;

  return (
    <Card>
      <h2>Nueva transferencia</h2>

      {!hasTwoAccounts ? (
        <p className="text-body">Necesitás al menos dos cuentas para transferir.</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Select
            label="Cuenta origen"
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
          </Select>

          <Select
            label="Cuenta destino"
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
          </Select>

          <MoneyInput
            label={crossCurrency ? `Monto a debitar (${fromAccount!.currency})` : 'Monto'}
            id="transfer-from-amount"
            value={fromAmount}
            onValueChange={setFromAmount}
            required
            disabled={mutation.isPending}
          />

          {crossCurrency && (
            <MoneyInput
              label={`Monto a acreditar (${toAccount!.currency})`}
              id="transfer-to-amount"
              value={toAmount}
              onValueChange={(v) => {
                setToAmount(v);
                setToAmountTouched(true);
              }}
              required
              disabled={mutation.isPending}
              helper={
                rate?.unavailable
                  ? 'Cotización no disponible — ingresá el monto de destino a mano.'
                  : rate?.rate
                    ? `Cotización sugerida: 1 ${fromAccount!.currency} ≈ ${rate.rate} ${toAccount!.currency} (editable).`
                    : 'Buscando cotización...'
              }
            />
          )}

          <DateField
            label="Fecha"
            id="transfer-date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            disabled={mutation.isPending}
          />

          <Input
            label="Descripción"
            id="transfer-description"
            type="text"
            maxLength={500}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={mutation.isPending}
          />

          <Button type="submit" loading={mutation.isPending} className="self-start">
            {mutation.isPending ? 'Transfiriendo...' : 'Transferir'}
          </Button>
        </form>
      )}
    </Card>
  );
}
