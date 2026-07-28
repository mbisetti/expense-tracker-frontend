import { useEffect, useState, type FormEvent } from 'react';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { CurrencySelect } from '../../components/ui/CurrencySelect';
import { DateField } from '../../components/ui/DateField';
import { Button } from '../../components/ui/Button';
import { ArrowRightIcon } from '../../components/ui/icons';
import { useToast } from '../../components/ui/toastContext';
import { formatMoney, numberToAmountDisplay, parseAmountInput } from '../../lib/money';
import { useAccounts } from '../accounts/useAccounts';
import { useCreateTransfer, useUpdateTransfer } from './useTransferMutations';
import { useExchangeRate } from './useExchangeRate';
import { transferErrorMessage } from './errorMessages';
import type { TransferListItem } from './api';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

type TransferFormProps = {
  initialToAccountId?: string;
  /** Modo edición (Sprint 23 D4): prefill completo + submit por PUT. */
  transfer?: TransferListItem;
  /** Se llama tras un alta/edición exitosa (la página lo usa para cerrar el form en edición). */
  onDone?: () => void;
  /**
   * Borrar la transferencia. Sólo en edición: el botón salió de la fila de la tabla y vive acá
   * (patrón de Cuentas/Categorías/Métodos, S21 t4). La confirmación la maneja quien lo pasa.
   */
  onDelete?: () => void;
};

export function TransferForm({
  initialToAccountId,
  transfer,
  onDone,
  onDelete,
}: TransferFormProps = {}) {
  const isEdit = transfer !== undefined;
  const toast = useToast();
  const { data: accounts } = useAccounts();
  const createMutation = useCreateTransfer();
  const updateMutation = useUpdateTransfer();
  const mutation = isEdit ? updateMutation : createMutation;

  const [fromAccountId, setFromAccountId] = useState(transfer?.fromAccountId ?? '');
  const [toAccountId, setToAccountId] = useState(transfer?.toAccountId ?? initialToAccountId ?? '');
  const [fromCurrency, setFromCurrency] = useState(transfer?.fromCurrency ?? '');
  const [toCurrency, setToCurrency] = useState(transfer?.toCurrency ?? '');
  const [fromAmount, setFromAmount] = useState(
    transfer ? numberToAmountDisplay(transfer.fromAmount) : '',
  );
  const [toAmount, setToAmount] = useState(
    transfer ? numberToAmountDisplay(transfer.toAmount) : '',
  );
  // En edición el toAmount cargado es la verdad → no dejar que el efecto de cotización lo pise.
  const [toAmountTouched, setToAmountTouched] = useState(isEdit);
  const [date, setDate] = useState(transfer?.date ?? todayIso());
  const [description, setDescription] = useState(transfer?.description ?? '');

  const fromAccount = accounts?.find((a) => a.id === fromAccountId);
  const toAccount = accounts?.find((a) => a.id === toAccountId);

  // CREDIT es mono-moneda (D2): su pata queda fija en la moneda de la cuenta.
  const fromIsCredit = fromAccount?.type === 'CREDIT';
  const toIsCredit = toAccount?.type === 'CREDIT';
  // Moneda resuelta de cada pata (Sprint 22): la elegida, o la principal si aún no se tocó.
  const resolvedFromCcy = fromIsCredit ? fromAccount!.currency : fromCurrency || fromAccount?.currency || '';
  const resolvedToCcy = toIsCredit ? toAccount!.currency : toCurrency || toAccount?.currency || '';

  // crossCurrency depende de las monedas RESUELTAS (no de las cuentas): habilita el caso
  // intra-cuenta (comprar USD dentro de una cuenta) y el override de moneda por pata.
  const crossCurrency = !!resolvedFromCcy && !!resolvedToCcy && resolvedFromCcy !== resolvedToCcy;
  // Misma cuenta + misma moneda no mueve nada → error inline (el backend también lo rechaza).
  const sameAccountSameCurrency =
    !!fromAccountId && fromAccountId === toAccountId && resolvedFromCcy === resolvedToCcy;

  const { data: rate } = useExchangeRate(
    crossCurrency ? resolvedFromCcy : undefined,
    crossCurrency ? resolvedToCcy : undefined,
  );

  // Pre-llena el monto de destino con la cotización sugerida, salvo que el usuario lo haya
  // editado (o sea una edición con el monto ya cargado): el monto real lo pone el usuario.
  // (lint set-state-in-effect pre-existente — no tocado en esta migración, ver reporte S19 B3)
  useEffect(() => {
    if (crossCurrency && rate?.rate && !toAmountTouched && fromAmount) {
      setToAmount(numberToAmountDisplay(round2(parseAmountInput(fromAmount) * rate.rate)));
    }
  }, [crossCurrency, rate, fromAmount, toAmountTouched]);

  // Sprint 22: el destino puede ser CUALQUIER cuenta, incluida la misma que el origen.
  const toOptions = accounts ?? [];

  const handleFromChange = (id: string) => {
    setFromAccountId(id);
    setToAmountTouched(false);
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
    const input = {
      fromAccountId,
      toAccountId,
      fromAmount: from,
      toAmount: to,
      fromCurrency: resolvedFromCcy || undefined,
      toCurrency: resolvedToCcy || undefined,
      date,
      description: description || undefined,
    };
    const onSuccess = (data: { fromAccountBalance: number; toAccountBalance: number }) => {
      const verb = isEdit ? 'Transferencia actualizada' : 'Transferencia realizada';
      toast.success(
        `${verb}. Nuevo saldo — ${fromAccount!.name} (${resolvedFromCcy}): ${formatMoney(data.fromAccountBalance, resolvedFromCcy)} · ${toAccount!.name} (${resolvedToCcy}): ${formatMoney(data.toAccountBalance, resolvedToCcy)}`,
      );
      if (isEdit) {
        onDone?.();
      } else {
        setFromAmount('');
        setToAmount('');
        setToAmountTouched(false);
        setDescription('');
        onDone?.();
      }
    };
    const onError = (error: unknown) =>
      toast.error(transferErrorMessage(error as Parameters<typeof transferErrorMessage>[0]));

    if (isEdit) {
      updateMutation.mutate({ id: transfer.id, input }, { onSuccess, onError });
    } else {
      createMutation.mutate(input, { onSuccess, onError });
    }
  };

  // Sprint 22: con transfers intra-cuenta alcanza UNA cuenta (comprar USD dentro de ella).
  const hasAccounts = (accounts?.length ?? 0) >= 1;

  return (
    <Card>
      <h2>{isEdit ? 'Editar transferencia' : 'Nueva transferencia'}</h2>

      {!hasAccounts ? (
        <p className="text-body">Necesitás al menos una cuenta para transferir.</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* Fila 1 (D5): cuenta origen ½ | moneda origen ½ */}
          <div className="grid gap-3 sm:grid-cols-2">
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

            {/* Moneda de la pata origen (D5). CREDIT → chip fijo; el resto → CurrencySelect. */}
            {fromAccount &&
              (fromIsCredit ? (
                <Input
                  label="Moneda origen"
                  id="transfer-from-currency-fixed"
                  value={resolvedFromCcy}
                  readOnly
                  disabled
                />
              ) : (
                <CurrencySelect
                  key={`from-${fromAccountId}`}
                  id="transfer-from-currency"
                  label="Moneda origen"
                  options={(fromAccount.balances ?? []).map((b) => b.currency)}
                  value={fromCurrency}
                  onChange={setFromCurrency}
                  disabled={mutation.isPending}
                />
              ))}
          </div>

          {/* Fila 2 (D5): cuenta destino ½ | moneda destino ½ */}
          <div className="grid gap-3 sm:grid-cols-2">
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

            {toAccount &&
              (toIsCredit ? (
                <Input
                  label="Moneda destino"
                  id="transfer-to-currency-fixed"
                  value={resolvedToCcy}
                  readOnly
                  disabled
                />
              ) : (
                <CurrencySelect
                  key={`to-${toAccountId}`}
                  id="transfer-to-currency"
                  label="Moneda destino"
                  options={(toAccount.balances ?? []).map((b) => b.currency)}
                  value={toCurrency}
                  onChange={setToCurrency}
                  disabled={mutation.isPending}
                />
              ))}
          </div>

          {sameAccountSameCurrency && (
            <p role="alert" className="text-sm text-expense">
              Elegí cuentas distintas, o monedas distintas dentro de la misma cuenta.
            </p>
          )}

          {/* Fila 3 (D6): monto a debitar → monto a acreditar ("de esto pasa a esto"). La flecha
              aparece SOLO cuando las monedas difieren; en angosto las mitades se apilan y la
              flecha rota a vertical. Same-currency → un solo MoneyInput, sin flecha. */}
          {crossCurrency ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1">
                <MoneyInput
                  label={`Monto a debitar (${resolvedFromCcy})`}
                  id="transfer-from-amount"
                  value={fromAmount}
                  onValueChange={setFromAmount}
                  required
                  disabled={mutation.isPending}
                />
              </div>
              <div className="flex justify-center py-1 text-muted sm:pb-3" aria-hidden="true">
                <ArrowRightIcon className="h-5 w-5 rotate-90 sm:rotate-0" />
              </div>
              <div className="flex-1">
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
              </div>
            </div>
          ) : (
            <MoneyInput
              label={`Monto${resolvedFromCcy ? ` (${resolvedFromCcy})` : ''}`}
              id="transfer-from-amount"
              value={fromAmount}
              onValueChange={setFromAmount}
              required
              disabled={mutation.isPending}
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

          <div className="flex gap-3">
            <Button
              type="submit"
              loading={mutation.isPending}
              disabled={sameAccountSameCurrency}
              className="self-start"
            >
              {mutation.isPending
                ? isEdit
                  ? 'Guardando...'
                  : 'Transfiriendo...'
                : isEdit
                  ? 'Guardar'
                  : 'Transferir'}
            </Button>
            {isEdit && onDone && (
              <Button
                type="button"
                variant="secondary"
                onClick={onDone}
                disabled={mutation.isPending}
                className={onDelete ? 'mx-auto' : undefined}
              >
                Cancelar
              </Button>
            )}
            {isEdit && onDelete && (
              <Button
                type="button"
                variant="ghost"
                onClick={onDelete}
                disabled={mutation.isPending}
                className="border-expense/40 text-expense hover:bg-expense/10 hover:text-expense"
              >
                Borrar
              </Button>
            )}
          </div>
        </form>
      )}
    </Card>
  );
}
