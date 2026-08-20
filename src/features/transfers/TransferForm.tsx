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
import { currencyOptionsFor } from '../../lib/currencyOptions';
import { useAccounts } from '../accounts/useAccounts';
import { useMe } from '../auth/useMe';
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
  /**
   * S40 (D4): hermana de la de arriba, para las quick actions de la card de cuenta — "Retirar"
   * prellena el origen igual que "Agregar plata" prellena el destino. Sin esto no había forma de
   * abrir el form apuntando a la cuenta desde la que sale la plata.
   */
  initialFromAccountId?: string;
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
  initialFromAccountId,
  transfer,
  onDone,
  onDelete,
}: TransferFormProps = {}) {
  const isEdit = transfer !== undefined;
  const toast = useToast();
  const { data: accounts } = useAccounts();
  // S27.1: las monedas configuradas en Ajustes se ofrecen en las dos patas aunque la cuenta no
  // tenga saldo en ellas. Gastar una que no tenés lo sigue frenando el server
  // (INSUFFICIENT_BALANCE): esto ofrece opciones, no promete saldo.
  const { data: me } = useMe();
  const createMutation = useCreateTransfer();
  const updateMutation = useUpdateTransfer();
  const mutation = isEdit ? updateMutation : createMutation;

  const [fromAccountId, setFromAccountId] = useState(
    transfer?.fromAccountId ?? initialFromAccountId ?? '',
  );
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
  // S41: comisión del destino. Se puede cargar como monto o como % de lo que entra, pero lo que
  // viaja al backend es SIEMPRE el monto: el banco cobra un número, no una fórmula, y guardar el
  // porcentaje sería guardar la cuenta en vez del hecho.
  const [feeMode, setFeeMode] = useState<'amount' | 'percent'>('amount');
  const [feeInput, setFeeInput] = useState(
    transfer?.fee != null ? numberToAmountDisplay(transfer.fee) : '',
  );

  const fromAccount = accounts?.find((a) => a.id === fromAccountId);
  const toAccount = accounts?.find((a) => a.id === toAccountId);

  // Moneda resuelta de cada pata (Sprint 22): la elegida, o la principal si aún no se tocó.
  //
  // Sprint 27: acá vivía otro espejo del guard mono-moneda (S22 D2) — la pata de una CREDIT
  // quedaba clavada en la moneda de la cuenta. Pagar en pesos una deuda en dólares ES un
  // transfer cross-currency hacia la tarjeta, así que con esto puesto el camino manual estaba
  // cerrado (y también el de D4: comprar dólares primero y después pagar USD→USD a mano).
  const resolvedFromCcy = fromCurrency || fromAccount?.currency || '';
  const resolvedToCcy = toCurrency || toAccount?.currency || '';

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

  // S41: lo que realmente entra al destino, contra lo que se calcula el % y se valida la comisión.
  const creditedAmount = crossCurrency ? parseAmountInput(toAmount) : parseAmountInput(fromAmount);
  const feeRaw = parseAmountInput(feeInput);
  const feeAmount =
    feeRaw > 0 && feeMode === 'percent' ? round2((creditedAmount * feeRaw) / 100) : feeRaw;
  // Espejo del guard del backend (FEE_EXCEEDS_TRANSFER): una comisión que se come todo lo que
  // entró es siempre un error de tipeo. Se avisa acá para no gastar un round-trip.
  const feeTooLarge = feeAmount > 0 && creditedAmount > 0 && feeAmount >= creditedAmount;

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
    if (sameAccountSameCurrency || feeTooLarge) return; // guards cliente (el botón ya está deshabilitado)
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
      fee: feeAmount > 0 ? feeAmount : undefined,
    };
    const onSuccess = (data: { fromAccountBalance: number; toAccountBalance: number }) => {
      const verb = isEdit ? 'Transferencia actualizada' : 'Transferencia realizada';
      toast.success(
        `${verb}. Nuevo saldo: ${fromAccount!.name} (${resolvedFromCcy}) ${formatMoney(data.fromAccountBalance, resolvedFromCcy)} · ${toAccount!.name} (${resolvedToCcy}) ${formatMoney(data.toAccountBalance, resolvedToCcy)}`,
      );
      if (isEdit) {
        onDone?.();
      } else {
        setFromAmount('');
        setToAmount('');
        setToAmountTouched(false);
        setDescription('');
        setFeeInput('');
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

            {/* Moneda de la pata origen (D5). Sprint 27: también editable en una CREDIT — su
                pata ya no está clavada en la moneda de la cuenta. */}
            {fromAccount && (
              <CurrencySelect
                key={`from-${fromAccountId}`}
                id="transfer-from-currency"
                label="Moneda origen"
                options={currencyOptionsFor(fromAccount, me?.workingCurrencies, me?.defaultCurrency)}
                value={fromCurrency}
                onChange={setFromCurrency}
                disabled={mutation.isPending}
              />
            )}
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
                  {account.id === fromAccountId ? ' · misma cuenta' : ''}
                </option>
              ))}
            </Select>

            {toAccount && (
              <CurrencySelect
                key={`to-${toAccountId}`}
                id="transfer-to-currency"
                label="Moneda destino"
                options={currencyOptionsFor(toAccount, me?.workingCurrencies, me?.defaultCurrency)}
                value={toCurrency}
                onChange={setToCurrency}
                disabled={mutation.isPending}
              />
            )}
          </div>

          {sameAccountSameCurrency && (
            <p role="alert" className="text-sm text-expense">
              Elegí cuentas distintas, o monedas distintas dentro de la misma cuenta.
            </p>
          )}

          {/* Fila 3 (D6): monto a debitar → monto a acreditar ("de esto pasa a esto"). La flecha
              aparece SOLO cuando las monedas difieren; en angosto las mitades se apilan y la
              flecha rota a vertical. Same-currency → un solo MoneyInput, sin flecha.

              Alineación por ARRIBA, no por abajo: sólo el campo de la derecha lleva helper (la
              cotización), así que con `items-end` los bordes de abajo coincidían y el input de
              acreditar te quedaba un renglón más alto que el de debitar (reporte de Marko).
              Con `items-start` los dos labels y los dos inputs quedan a la misma altura y el
              helper cuelga abajo sin correr nada, aunque ocupe dos líneas. */}
          {crossCurrency ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
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
              {/* mt-10 = label (21px) + gap-1.5 (6px) + medio input (22px) − medio ícono (10px):
                  la flecha cae en el centro de los inputs, no arriba de todo. */}
              <div className="flex justify-center py-1 text-muted sm:mt-10 sm:py-0" aria-hidden="true">
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
                      ? 'Cotización no disponible: ingresá el monto de destino a mano.'
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

          {/* S41: comisión del destino. Opcional y siempre visible (un campo vacío no molesta y
              un bloque escondido detrás de un switch hace que nadie se entere de que existe).
              El % es sólo comodidad de tecleo: lo que se guarda es el monto resultante. */}
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
            <MoneyInput
              label={
                feeMode === 'percent'
                  ? 'Comisión del destino (%)'
                  : `Comisión del destino${resolvedToCcy ? ` (${resolvedToCcy})` : ''}`
              }
              id="transfer-fee"
              value={feeInput}
              onValueChange={setFeeInput}
              disabled={mutation.isPending}
              error={feeTooLarge ? 'No puede ser mayor a lo que entra al destino.' : undefined}
              helper={
                feeAmount > 0 && !feeTooLarge
                  ? `Se anota como gasto de ${formatMoney(feeAmount, resolvedToCcy)} en ${toAccount?.name ?? 'la cuenta destino'}, categoría Comisiones.`
                  : 'Opcional. Lo que te cobran por recibir la plata.'
              }
            />
            {/* El toggle se alinea con el INPUT, no con el bloque entero: el label de arriba y
                el helper de abajo no cuentan. En vez de empujarlo con un margen a ojo, la
                columna repite la estructura del campo (spacer del alto del label + el mismo
                gap-1.5), así los botones arrancan exactamente donde arranca el input y siguen
                alineados si el label cambia. El spacer sólo existe de sm para arriba: abajo de
                eso el grid es de una columna y el toggle va apilado, sin nada que alinear. */}
            <div className="flex flex-col gap-1.5">
              <span aria-hidden="true" className="hidden text-sm font-medium sm:block">
                &nbsp;
              </span>
              <div role="tablist" aria-label="Cómo se carga la comisión" className="flex gap-2">
                {(['amount', 'percent'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    role="tab"
                    aria-selected={feeMode === mode}
                    onClick={() => setFeeMode(mode)}
                    disabled={mutation.isPending}
                    className={`h-11 w-11 rounded-md border text-sm ${
                      feeMode === mode
                        ? 'border-brand bg-brand-bg text-brand'
                        : 'border-line bg-transparent text-body'
                    }`}
                  >
                    {mode === 'amount' ? '$' : '%'}
                  </button>
                ))}
              </div>
            </div>
          </div>

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
              disabled={sameAccountSameCurrency || feeTooLarge}
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
                className="ml-auto border-expense/40 text-expense hover:bg-expense/10 hover:text-expense"
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
