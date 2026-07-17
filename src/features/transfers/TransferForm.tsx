import { useEffect, useState, type FormEvent } from 'react';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { CurrencySelect } from '../../components/ui/CurrencySelect';
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
  const [fromCurrency, setFromCurrency] = useState('');
  const [toCurrency, setToCurrency] = useState('');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [toAmountTouched, setToAmountTouched] = useState(false);
  const [date, setDate] = useState(todayIso());
  const [description, setDescription] = useState('');

  const fromAccount = accounts?.find((a) => a.id === fromAccountId);
  const toAccount = accounts?.find((a) => a.id === toAccountId);

  // CREDIT es mono-moneda (D2): su pata queda fija en la moneda de la cuenta.
  const fromIsCredit = fromAccount?.type === 'CREDIT';
  const toIsCredit = toAccount?.type === 'CREDIT';
  // Moneda resuelta de cada pata (Sprint 22): la elegida, o la principal si aún no se tocó.
  const resolvedFromCcy = fromIsCredit ? fromAccount!.currency : fromCurrency || fromAccount?.currency || '';
  const resolvedToCcy = toIsCredit ? toAccount!.currency : toCurrency || toAccount?.currency || '';

  // crossCurrency ahora depende de las monedas RESUELTAS (no de las cuentas): habilita el
  // caso intra-cuenta (comprar USD dentro de una cuenta) y el override de moneda por pata.
  const crossCurrency = !!resolvedFromCcy && !!resolvedToCcy && resolvedFromCcy !== resolvedToCcy;
  // Misma cuenta + misma moneda no mueve nada → error inline (el backend también lo rechaza).
  const sameAccountSameCurrency =
    !!fromAccountId && fromAccountId === toAccountId && resolvedFromCcy === resolvedToCcy;

  const { data: rate } = useExchangeRate(
    crossCurrency ? resolvedFromCcy : undefined,
    crossCurrency ? resolvedToCcy : undefined,
  );

  // Pre-llena el monto de destino con la cotización sugerida, salvo que el usuario lo
  // haya editado: el monto real lo pone el usuario (el rate es sugerencia, no verdad).
  // (lint set-state-in-effect pre-existente — no tocado en esta migración, ver reporte S19 B3)
  useEffect(() => {
    if (crossCurrency && rate?.rate && !toAmountTouched && fromAmount) {
      setToAmount(numberToAmountDisplay(round2(parseAmountInput(fromAmount) * rate.rate)));
    }
  }, [crossCurrency, rate, fromAmount, toAmountTouched]);

  // Sprint 22: el destino puede ser CUALQUIER cuenta, incluida la misma que el origen
  // (conversión intra-cuenta entre monedas distintas).
  const toOptions = accounts ?? [];

  const handleFromChange = (id: string) => {
    setFromAccountId(id);
    setToAmountTouched(false);
    // la moneda de la pata vuelve a la principal de la cuenta elegida
    setFromCurrency(accounts?.find((a) => a.id === id)?.currency ?? '');
  };

  const handleToChange = (id: string) => {
    setToAccountId(id);
    setToAmountTouched(false);
    setToCurrency(accounts?.find((a) => a.id === id)?.currency ?? '');
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sameAccountSameCurrency) return; // guard cliente (el botón ya está deshabilitado)
    const from = parseAmountInput(fromAmount);
    const to = crossCurrency ? parseAmountInput(toAmount) : from;
    mutation.mutate(
      {
        fromAccountId,
        toAccountId,
        fromAmount: from,
        toAmount: to,
        fromCurrency: resolvedFromCcy || undefined,
        toCurrency: resolvedToCcy || undefined,
        date,
        description: description || undefined,
      },
      {
        onSuccess: (data) => {
          toast.success(
            `Transferencia realizada. Nuevo saldo — ${fromAccount!.name} (${resolvedFromCcy}): ${formatMoney(data.fromAccountBalance, resolvedFromCcy)} · ${toAccount!.name} (${resolvedToCcy}): ${formatMoney(data.toAccountBalance, resolvedToCcy)}`,
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

  // Sprint 22: con transfers intra-cuenta alcanza UNA cuenta (comprar USD dentro de ella).
  const hasAccounts = (accounts?.length ?? 0) >= 1;

  return (
    <Card>
      <h2>Nueva transferencia</h2>

      {!hasAccounts ? (
        <p className="text-body">Necesitás al menos una cuenta para transferir.</p>
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

          {/* Chip de moneda de la pata origen (Sprint 22 D4). CREDIT → fija, sin selector. */}
          {fromAccount && !fromIsCredit && (
            <CurrencySelect
              key={`from-${fromAccountId}`}
              id="transfer-from-currency"
              label="Moneda origen"
              options={(fromAccount.balances ?? []).map((b) => b.currency)}
              value={fromCurrency}
              onChange={setFromCurrency}
              disabled={mutation.isPending}
            />
          )}

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
                {account.id === fromAccountId ? ' — misma cuenta' : ''}
              </option>
            ))}
          </Select>

          {/* Chip de moneda de la pata destino (Sprint 22 D4). CREDIT → fija, sin selector. */}
          {toAccount && !toIsCredit && (
            <CurrencySelect
              key={`to-${toAccountId}`}
              id="transfer-to-currency"
              label="Moneda destino"
              options={(toAccount.balances ?? []).map((b) => b.currency)}
              value={toCurrency}
              onChange={setToCurrency}
              disabled={mutation.isPending}
            />
          )}

          {sameAccountSameCurrency && (
            <p role="alert" className="text-sm text-expense">
              Elegí cuentas distintas, o monedas distintas dentro de la misma cuenta.
            </p>
          )}

          <MoneyInput
            label={crossCurrency ? `Monto a debitar (${resolvedFromCcy})` : `Monto${resolvedFromCcy ? ` (${resolvedFromCcy})` : ''}`}
            id="transfer-from-amount"
            value={fromAmount}
            onValueChange={setFromAmount}
            required
            disabled={mutation.isPending}
          />

          {crossCurrency && (
            <MoneyInput
              label={`Monto a acreditar (${resolvedToCcy})`}
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
                    ? `Cotización sugerida: 1 ${resolvedFromCcy} ≈ ${rate.rate} ${resolvedToCcy} (editable).`
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

          <Button
            type="submit"
            loading={mutation.isPending}
            disabled={sameAccountSameCurrency}
            className="self-start"
          >
            {mutation.isPending ? 'Transfiriendo...' : 'Transferir'}
          </Button>
        </form>
      )}
    </Card>
  );
}
