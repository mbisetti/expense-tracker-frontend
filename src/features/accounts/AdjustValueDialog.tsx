import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { CurrencySelect } from '../../components/ui/CurrencySelect';
import { Button } from '../../components/ui/Button';
import { formatMoney, parseAmountInput, numberToAmountDisplay } from '../../lib/money';
import { currencyOptionsFor } from '../../lib/currencyOptions';
import { useMe } from '../auth/useMe';
import type { Account, AdjustValueInput } from './api';

type AdjustValueDialogProps = {
  account: Account;
  loading?: boolean;
  /**
   * S43 (D7): valor de mercado estimado de la cuenta, en su moneda PRINCIPAL. Sin la prop el
   * diálogo queda exactamente como lo dejó S40.
   *
   * Es una SUGERENCIA: llena el input de un tap y el usuario ve y confirma como siempre. Nunca
   * se escribe sola, y por eso es un prefill y no un valor por default.
   */
  suggestedValue?: number | null;
  onConfirm: (input: AdjustValueInput) => void;
  onCancel: () => void;
};

/**
 * S40 (D2): "¿cuánto vale hoy?" / "¿cuánto debés hoy?".
 *
 * El usuario dice el VALOR y el server crea la transacción por la diferencia. Es la misma regla
 * que el sprint del bot dejó consolidada: se pide el dato que la persona sabe, no una cuenta.
 *
 * En una deuda el monto se ingresa POSITIVO ("debo 103.000"): nadie piensa su deuda en números
 * negativos. El server lo lleva a negativo.
 */
export function AdjustValueDialog({
  account,
  loading,
  suggestedValue,
  onConfirm,
  onCancel,
}: AdjustValueDialogProps) {
  const isDebt = account.type === 'DEBT';
  const { data: me } = useMe();

  const currencyOptions = currencyOptionsFor(account, me?.workingCurrencies, me?.defaultCurrency);
  const [currency, setCurrency] = useState(currencyOptions[0] ?? account.currency);

  // Saldo actual de LA MONEDA elegida (no el total mezclado): es contra eso que se calcula el
  // delta, igual que en el server.
  const currentBalance =
    (account.balances ?? []).find((b) => b.currency === currency)?.balance ??
    (currency === account.currency ? account.balance : 0);
  // En una deuda el saldo vive negativo y se muestra positivo, en los dos sentidos.
  const currentValue = isDebt ? -currentBalance : currentBalance;

  const [value, setValue] = useState(numberToAmountDisplay(currentValue));
  const target = parseAmountInput(value);
  const delta = target - currentValue;
  const canSubmit = value.trim() !== '' && target >= 0;

  return (
    <Modal
      open
      onClose={onCancel}
      title={isDebt ? `Ajustar la deuda de ${account.name}` : `Actualizar ${account.name}`}
      footer={
        <div className="flex gap-3">
          <Button
            type="button"
            onClick={() => onConfirm({ currency, currentValue: target })}
            loading={loading}
            disabled={!canSubmit}
          >
            Guardar
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-body">
          {isDebt
            ? 'Decinos cuánto debés hoy y anotamos la diferencia (intereses, punitorios, un cargo que no esperabas).'
            : 'Decinos cuánto vale hoy y anotamos la diferencia. No hace falta que calcules nada.'}
        </p>

        {currencyOptions.length > 1 && (
          <CurrencySelect
            id="adjust-currency"
            label="Moneda"
            options={currencyOptions}
            value={currency}
            onChange={(next) => {
              setCurrency(next);
              // El valor precargado es el de la moneda anterior: limpiarlo evita "confirmar" un
              // número que ya no corresponde a nada.
              setValue('');
            }}
            disabled={loading}
          />
        )}

        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="text-muted">{isDebt ? 'Debés ahora' : 'Vale ahora'}</span>
          <span className="font-semibold tabular-nums text-ink">
            {formatMoney(currentValue, currency)}
          </span>
        </div>

        <MoneyInput
          label={isDebt ? '¿Cuánto debés hoy?' : '¿Cuánto vale hoy?'}
          id="adjust-value"
          value={value}
          onValueChange={setValue}
          required
          disabled={loading}
        />

        {/* S43 (D7): el atajo de un tap. Sólo para la moneda principal, que es en la que el
            server calculó la estimación. Es una SUGERENCIA etiquetada: se ensucia con ajustes
            previos y con ventas con ganancia, así que se ofrece y no se impone. */}
        {suggestedValue != null && currency === account.currency && (
          <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
            <span className="text-muted">
              Según mercado hoy: ≈{' '}
              <span className="tabular-nums text-ink">
                {formatMoney(suggestedValue, account.currency)}
              </span>
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setValue(numberToAmountDisplay(suggestedValue))}
              disabled={loading}
            >
              Usar este valor
            </Button>
          </div>
        )}

        {/* Preview del delta: el usuario ve EXACTAMENTE qué movimiento se va a crear antes de
            confirmarlo. Es plata; se ve antes de anotar. */}
        {canSubmit && delta !== 0 && (
          <p className="text-sm text-body">
            Se registra un ajuste de{' '}
            {/* El signo va explícito y el color acompaña, nunca al revés (design-principles §1.6).
                En una deuda "más" es malo y "menos" es bueno: los tonos se invierten. */}
            <span
              className={`font-semibold tabular-nums ${
                (isDebt ? -delta : delta) > 0 ? 'text-income' : 'text-expense'
              }`}
            >
              {delta > 0 ? '+' : '−'}
              {formatMoney(Math.abs(delta), currency)}
            </span>
            .
          </p>
        )}
        {canSubmit && delta === 0 && (
          <p className="text-sm text-muted">El valor no cambió: no se registra nada.</p>
        )}
        {!canSubmit && value.trim() !== '' && (
          <p role="alert" className="text-sm text-expense">
            El valor de hoy no puede ser negativo.
          </p>
        )}

        <p className="text-xs text-muted">
          {isDebt
            ? 'Mueve el saldo de la cuenta pero no cuenta como gasto del mes: no es plata que salió de ningún lado.'
            : 'Mueve el saldo y cuenta como rendimiento, pero no como ingreso del mes: que suba la valuación no te puso un peso en el bolsillo.'}
        </p>
      </div>
    </Modal>
  );
}
