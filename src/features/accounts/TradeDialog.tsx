import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { Button } from '../../components/ui/Button';
import { Switch } from '../../components/ui/Switch';
import { useToast } from '../../components/ui/toastContext';
import { formatMoney, formatQuantity, parseAmountInput } from '../../lib/money';
import { accountErrorMessage } from './errorMessages';
import { useHoldingMutations, useHoldings } from './useHoldings';
import type { Account } from './api';

type TradeDialogProps = {
  account: Account;
  onClose: () => void;
};

type Side = 'BUY' | 'SELL';

/**
 * S43 (D5/D6) — "compré" / "vendí".
 *
 * <p><b>El usuario dice qué pasó; las cuentas las hace el server.</b> Es la regla que S32.1 dejó
 * consolidada cuando el LLM del bot restaba mal los repartos, y vale igual para un humano: pedirle
 * que calcule el invertido proporcional de una venta es pedirle la cuenta que la app existe para
 * hacer.
 *
 * <p><b>Preview antes de confirmar.</b> Regla de la casa desde S32: todo flujo que toca plata se
 * pre-confirma. Acá el preview importa más que en otros lados porque una compra NO mueve el saldo
 * y una comisión en plata SÍ: verlo escrito antes de tocar el botón es lo que evita la sorpresa.
 *
 * <p>Copy sin em dashes (preferencia de Marko).
 */
export function TradeDialog({ account, onClose }: TradeDialogProps) {
  const toast = useToast();
  const { data: holdings } = useHoldings(account.id);
  const { trade } = useHoldingMutations(account.id);

  const [side, setSide] = useState<Side>('BUY');
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [amount, setAmount] = useState('');
  const [feeInCrypto, setFeeInCrypto] = useState(false);
  const [fee, setFee] = useState('');
  const [feeSymbol, setFeeSymbol] = useState('');
  const [feeQuantity, setFeeQuantity] = useState('');

  const cleanSymbol = symbol.trim().toUpperCase();
  const cleanFeeSymbol = feeSymbol.trim().toUpperCase();
  const parsedQuantity = parseAmountInput(quantity);
  const parsedAmount = parseAmountInput(amount);
  const parsedFee = parseAmountInput(fee);
  const parsedFeeQuantity = parseAmountInput(feeQuantity);

  const existing = holdings?.holdings.find((h) => h.symbol === cleanSymbol);
  // Vender más de lo que tenés lo rechaza el server igual; avisarlo acá evita el viaje y, sobre
  // todo, evita que el usuario crea que anotó algo que no se anotó.
  const sellsTooMuch =
    side === 'SELL' && existing !== undefined && parsedQuantity > existing.quantity;
  const sellsUnknown = side === 'SELL' && cleanSymbol !== '' && existing === undefined;

  const feeIncomplete = feeInCrypto && (cleanFeeSymbol === '') !== (parsedFeeQuantity === 0);

  const canSubmit =
    cleanSymbol !== '' && parsedQuantity > 0 && !sellsTooMuch && !sellsUnknown && !feeIncomplete;

  const submit = () => {
    if (!canSubmit) return;
    trade.mutate(
      {
        side,
        symbol: cleanSymbol,
        quantity: parsedQuantity,
        amount: parsedAmount,
        ...(feeInCrypto
          ? cleanFeeSymbol !== '' && parsedFeeQuantity > 0
            ? { feeSymbol: cleanFeeSymbol, feeQuantity: parsedFeeQuantity }
            : {}
          : parsedFee > 0
            ? { fee: parsedFee }
            : {}),
      },
      {
        onSuccess: (result) => {
          toast.success(
            result.removed
              ? `Vendiste todo tu ${result.symbol}.`
              : `Listo. Ahora tenés ${formatQuantity(result.quantity)} ${result.symbol}.`,
          );
          onClose();
        },
        onError: (error) => toast.error(accountErrorMessage(error)),
      },
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      disableClose={trade.isPending}
      title={`${side === 'BUY' ? 'Compré' : 'Vendí'} en ${account.name}`}
      className="min-h-[26rem]"
      footer={
        <div className="flex gap-3">
          <Button type="button" onClick={submit} loading={trade.isPending} disabled={!canSubmit}>
            Confirmar
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={trade.isPending}
          >
            Cancelar
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        {/* Toggle Compré/Vendí. Dos botones y no un select: son dos, y cuál está elegido tiene
            que verse sin abrir nada. */}
        <div className="flex gap-2" role="group" aria-label="Qué hiciste">
          {(['BUY', 'SELL'] as const).map((option) => (
            <Button
              key={option}
              type="button"
              variant={side === option ? 'primary' : 'ghost'}
              size="sm"
              aria-pressed={side === option}
              onClick={() => setSide(option)}
              disabled={trade.isPending}
            >
              {option === 'BUY' ? 'Compré' : 'Vendí'}
            </Button>
          ))}
        </div>

        <Input
          label="Moneda"
          id="trade-symbol"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          placeholder="BTC"
          maxLength={15}
          autoComplete="off"
          list="trade-symbol-options"
          required
          disabled={trade.isPending}
          helper={
            existing
              ? `Tenés ${formatQuantity(existing.quantity)} ${existing.symbol}.`
              : 'Si es la primera vez, se crea la tenencia sola.'
          }
        />
        {/* Datalist con lo que ya tenés, pero texto libre igual: comprar algo nuevo es lo
            normal en una cuenta cripto. */}
        <datalist id="trade-symbol-options">
          {(holdings?.holdings ?? []).map((h) => (
            <option key={h.id} value={h.symbol} />
          ))}
        </datalist>

        <MoneyInput
          label="Cantidad"
          id="trade-quantity"
          value={quantity}
          onValueChange={setQuantity}
          maxDecimals={8}
          required
          disabled={trade.isPending}
        />

        <MoneyInput
          label={side === 'BUY' ? `Cuánto pagaste (${account.currency})` : `Cuánto recibiste (${account.currency})`}
          id="trade-amount"
          value={amount}
          onValueChange={setAmount}
          disabled={trade.isPending}
          helper="Sin la comisión: esa va abajo."
        />

        <Switch
          id="trade-fee-in-crypto"
          checked={feeInCrypto}
          onChange={setFeeInCrypto}
          label="La comisión me la cobraron en cripto"
          helper="Por ejemplo 0,001 BNB. Se descuenta de esa tenencia y no cuenta como gasto."
          disabled={trade.isPending}
        />

        {feeInCrypto ? (
          <div className="flex flex-col gap-3">
            <Input
              label="Moneda de la comisión"
              id="trade-fee-symbol"
              value={feeSymbol}
              onChange={(e) => setFeeSymbol(e.target.value)}
              placeholder="BNB"
              maxLength={15}
              autoComplete="off"
              disabled={trade.isPending}
            />
            <MoneyInput
              label="Cantidad de la comisión"
              id="trade-fee-quantity"
              value={feeQuantity}
              onValueChange={setFeeQuantity}
              maxDecimals={8}
              disabled={trade.isPending}
            />
          </div>
        ) : (
          <MoneyInput
            label={`Comisión (${account.currency})`}
            id="trade-fee"
            value={fee}
            onValueChange={setFee}
            disabled={trade.isPending}
            helper="Opcional. Se anota como gasto real, porque esa plata se fue."
          />
        )}

        {/* PREVIEW: qué va a pasar exactamente, antes de tocar Confirmar. Plata se pre-confirma. */}
        {canSubmit && (
          <div className="flex flex-col gap-1 rounded-md bg-surface-sunken p-3">
            <p className="text-sm text-body">
              {side === 'BUY'
                ? `Se suma ${formatQuantity(parsedQuantity)} ${cleanSymbol} a tus tenencias.`
                : `Se descuenta ${formatQuantity(parsedQuantity)} ${cleanSymbol} de tus tenencias.`}
            </p>
            {feeInCrypto && cleanFeeSymbol !== '' && parsedFeeQuantity > 0 && (
              <p className="text-sm text-body">
                Se descuenta {formatQuantity(parsedFeeQuantity)} {cleanFeeSymbol} de comisión. No
                cuenta como gasto: no salió plata, salió cripto.
              </p>
            )}
            {!feeInCrypto && parsedFee > 0 && (
              <p className="text-sm text-body">
                Se anota un gasto de{' '}
                <span className="font-semibold tabular-nums text-ink">
                  {formatMoney(parsedFee, account.currency)}
                </span>{' '}
                de comisión.
              </p>
            )}
            <p className="text-xs text-muted">
              El saldo de la cuenta no cambia{parsedFee > 0 && !feeInCrypto ? ' salvo por la comisión' : ''}:
              la plata sigue adentro, sólo cambia de forma.
            </p>
          </div>
        )}

        {sellsUnknown && (
          <p role="alert" className="text-sm text-expense">
            No tenés {cleanSymbol} cargado. Cargalo primero desde Agregar.
          </p>
        )}
        {sellsTooMuch && existing && (
          <p role="alert" className="text-sm text-expense">
            Sólo tenés {formatQuantity(existing.quantity)} {existing.symbol}.
          </p>
        )}
        {feeIncomplete && (
          <p role="alert" className="text-sm text-expense">
            Completá la moneda y la cantidad de la comisión juntas.
          </p>
        )}
      </div>
    </Modal>
  );
}
