import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { Select } from '../../components/ui/Select';
import { CheckCircleIcon, XIcon } from '../../components/ui/icons';
import { useToast } from '../../components/ui/toastContext';
import { currencyNoun, formatMoney, numberToAmountDisplay, parseAmountInput } from '../../lib/money';
import { useMarkStatementPaid, useUnmarkStatementPaid } from './useStatementPaid';
import type { Account, Statement, StatementLine } from './api';

type StatementPaidToggleProps = {
  card: Account;
  data: Statement;
  /** El renglón de moneda que este widget maneja (Sprint 27: uno por moneda). */
  line: StatementLine;
  /** Madre (BANK/WALLET) si la tarjeta está vinculada; sin ella no se ofrece pagar de verdad. */
  parentAccount?: Account;
};

type DialogKind = 'none' | 'choose' | 'confirmMark' | 'insufficient' | 'undo';

function formatDate(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Sprint 22.4 + 27: widget "Pagar resumen" de UN RENGLÓN. Estados por ciclo navegado (A.1.2):
// abierto → texto; cerrado sin deuda → "nada que pagar"; cerrado cubierto por pagos → ✓
// derivado (no clickeable); cerrado con deuda → ✗ + tick; pagado (marca viva) → ✓ (deshace).
//
// El tick de una vinculada abre el diálogo de pago. Sprint 27: adentro hay un SELECTOR DE
// CUENTA (los sub-balances de la madre) y un monto. La moneda del pago sale de ese selector y
// no de un botón: el usuario nunca elige "pago en pesos o en dólares" en abstracto — elige de
// dónde sale la plata, y eso ya define la moneda (D5).
export function StatementPaidToggle({ card, data, line, parentAccount }: StatementPaidToggleProps) {
  const [dialog, setDialog] = useState<DialogKind>('none');
  // De qué sub-balance de la madre sale la plata. Default: el mismo del renglón, que es el caso
  // normal y hace que pagar sea un tap (D6).
  const [fromCurrency, setFromCurrency] = useState(line.currency);
  // Cuánto SALE de la cuenta. Solo se usa (y se pide) en un pago cross-currency.
  const [fromAmountInput, setFromAmountInput] = useState('');
  // Cuánta DEUDA CANCELA. Precargado con el restante del renglón (D6/FR-7), editable.
  const [amountInput, setAmountInput] = useState(numberToAmountDisplay(line.remainingToPay));

  const mark = useMarkStatementPaid(card.id);
  const unmark = useUnmarkStatementPaid(card.id);
  const toast = useToast();
  const navigate = useNavigate();

  const busy = mark.isPending || unmark.isPending;
  const isLinked = !!parentAccount;
  const amountLabel = formatMoney(line.remainingToPay, line.currency);

  // Sub-balances de la madre. Con S22 una cuenta mixta tiene varios, y cada uno es una forma
  // distinta de pagar este renglón: desde los dólares (directo) o desde los pesos (conversión).
  const parentBalances = parentAccount?.balances ?? [];
  const fromBalance = parentBalances.find((b) => b.currency === fromCurrency);
  const crossCurrency = fromCurrency !== line.currency;

  const payAmount = parseAmountInput(amountInput);
  const fromAmount = crossCurrency ? parseAmountInput(fromAmountInput) : payAmount;
  const amountsReady = payAmount > 0 && (!crossCurrency || fromAmount > 0);

  function close() {
    setDialog('none');
    // Devolver el diálogo a su default: si se abandonó a mitad, la próxima vez tiene que
    // volver a ser un tap y no arrastrar lo tipeado.
    setFromCurrency(line.currency);
    setFromAmountInput('');
    setAmountInput(numberToAmountDisplay(line.remainingToPay));
  }

  function doPay() {
    mark.mutate(
      {
        periodEnd: data.periodEnd,
        currency: line.currency,
        pay: true,
        // Misma moneda: se manda solo el monto (el server acepta que falte y calcula el
        // restante, pero acá el campo es editable así que va siempre explícito).
        ...(crossCurrency ? { fromCurrency, fromAmount } : {}),
        amount: payAmount,
      },
      {
        onSuccess: () => {
          close();
          toast.success('Resumen pagado');
        },
        onError: (e) => {
          // El server es la autoridad de último recurso: si el sub-balance cambió entre el
          // chequeo del front y el pago, mapeamos el 422 al diálogo de insuficiente.
          if (e.code === 'INSUFFICIENT_BALANCE') {
            setDialog('insufficient');
          } else {
            close();
            toast.error('No pudimos pagar el resumen. Intentá de nuevo.');
          }
        },
      },
    );
  }

  function doMark() {
    mark.mutate(
      { periodEnd: data.periodEnd, currency: line.currency, pay: false },
      {
        onSuccess: () => {
          close();
          toast.success('Resumen marcado como pagado');
        },
        onError: () => {
          close();
          toast.error('No pudimos marcar el resumen. Intentá de nuevo.');
        },
      },
    );
  }

  function doUndo() {
    unmark.mutate(
      { periodEnd: data.periodEnd, currency: line.currency },
      {
        onSuccess: () => {
          close();
          toast.success(line.paidWithTransfer ? 'Pago deshecho' : 'Marca deshecha');
        },
        onError: () => {
          close();
          toast.error('No pudimos deshacer. Intentá de nuevo.');
        },
      },
    );
  }

  // Chequeo de saldo en el front antes de disparar la transfer. Se mira contra `fromAmount`,
  // que en cross-currency es lo que realmente sale de la cuenta (y no lo que se cancela).
  function onChoosePay() {
    if ((fromBalance?.balance ?? 0) < fromAmount) {
      setDialog('insufficient');
      return;
    }
    doPay();
  }

  // El tick (estado pendiente): vinculada → diálogo de pago; suelta → confirmar marca.
  // Al abrirlo se elige el default del selector: la moneda del renglón si la madre la tiene
  // (el caso de un tap, D6), y si no la primera que tenga — que es justo el caso interesante,
  // pagar dólares desde los pesos. Sin esto el selector arrancaría en una opción inexistente.
  function onTick() {
    if (isLinked) {
      const preferred = parentBalances.some((b) => b.currency === line.currency)
        ? line.currency
        : (parentBalances[0]?.currency ?? line.currency);
      setFromCurrency(preferred);
      setFromAmountInput('');
      setAmountInput(numberToAmountDisplay(line.remainingToPay));
    }
    setDialog(isLinked ? 'choose' : 'confirmMark');
  }

  // La cruz (estado pagado): pago real pide confirmación (borra la transfer); cosmética directo.
  function onUnmark() {
    if (line.paidWithTransfer) {
      setDialog('undo');
    } else {
      doUndo();
    }
  }

  const lineNoun = currencyNoun(line.currency);

  const dialogs = (
    <>
      <Modal
        open={dialog === 'choose'}
        onClose={close}
        title={`Pagar las compras en ${lineNoun}`}
        disableClose={busy}
        footer={
          <div className="flex w-full flex-col gap-2">
            <Button
              variant="primary"
              onClick={onChoosePay}
              loading={mark.isPending}
              disabled={busy || !amountsReady}
            >
              Pagar desde {parentAccount?.name}
            </Button>
            <Button variant="secondary" onClick={doMark} disabled={busy}>
              Marcar como pagado
            </Button>
            <Button variant="secondary" onClick={close} disabled={busy}>
              Cancelar
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          {/* La moneda del pago sale de acá y no de un botón (D5): el usuario elige de dónde
              sale la plata, y eso ya define si el pago es directo o con conversión.
              El label nombra la moneda y no la cuenta: la cuenta es SIEMPRE la madre, y
              repetir su nombre en cada opción hacía parecer que esto elegía entre cuentas —
              con una sola opción, que además era la misma cuenta, el selector no se entendía. */}
          <Select
            label={`Con qué plata de ${parentAccount?.name}`}
            id="statement-pay-from"
            value={fromCurrency}
            onChange={(e) => {
              setFromCurrency(e.target.value);
              setFromAmountInput('');
            }}
            helper={
              parentBalances.length <= 1
                ? `${parentAccount?.name} solo tiene ${currencyNoun(fromCurrency)}. Para pagar con otra moneda, primero metela en la cuenta desde Movimientos.`
                : undefined
            }
          >
            {/* Solo los sub-balances que la madre realmente tiene. Si no tiene ninguno en la
                moneda del renglón, el único camino es la conversión — y ahora existe. */}
            {parentBalances.length > 0 ? (
              parentBalances.map((b) => (
                <option key={b.currency} value={b.currency}>
                  {currencyNoun(b.currency)} · {formatMoney(b.balance, b.currency)}
                </option>
              ))
            ) : (
              <option value={line.currency}>{currencyNoun(line.currency)}</option>
            )}
          </Select>

          {crossCurrency && (
            <MoneyInput
              label={`Sale de la cuenta (${fromCurrency})`}
              id="statement-pay-from-amount"
              value={fromAmountInput}
              onValueChange={setFromAmountInput}
            />
          )}

          <MoneyInput
            label={`Cancela de la deuda (${line.currency})`}
            id="statement-pay-amount"
            value={amountInput}
            onValueChange={setAmountInput}
          />

          {crossCurrency ? (
            <p className="text-sm text-muted">
              Pagás {lineNoun} desde tus {currencyNoun(fromCurrency)}: anotamos los dos montos tal
              cual, sin calcular el tipo de cambio. Entre uno y otro quedan la conversión del
              banco y los impuestos, que dependen de cómo pagues.
            </p>
          ) : (
            <p className="text-sm text-muted">
              Restante del renglón: {amountLabel} (lo gastado después del cierre no se incluye).{' '}
              <strong>Marcar como pagado</strong> solo lo marca, sin mover plata.
            </p>
          )}

          {payAmount > line.remainingToPay && line.remainingToPay > 0 && (
            <p role="status" className="text-sm text-expense">
              Estás pagando más que el restante: la tarjeta queda con saldo a favor en {lineNoun}.
              No baja la deuda de las otras monedas.
            </p>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={dialog === 'confirmMark'}
        title={`Marcar las compras en ${lineNoun} como pagadas`}
        message="Esto solo marca esta parte del resumen: no mueve plata ni cambia tus saldos, y no toca las otras monedas. Usalo si ya lo pagaste por fuera de la app."
        confirmLabel="Marcar"
        cancelLabel="Cancelar"
        onConfirm={doMark}
        onCancel={close}
        loading={mark.isPending}
      />

      <ConfirmDialog
        open={dialog === 'undo'}
        title="Deshacer el pago"
        message={`Se va a borrar la transferencia del pago y la deuda en ${lineNoun} vuelve. Las otras monedas no se tocan. ¿Seguro?`}
        confirmLabel="Deshacer"
        cancelLabel="Cancelar"
        danger
        onConfirm={doUndo}
        onCancel={close}
        loading={unmark.isPending}
      />

      <Modal
        open={dialog === 'insufficient'}
        onClose={close}
        title="Saldo insuficiente"
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              Cerrar
            </Button>
            <Button variant="primary" onClick={() => navigate('/transactions')}>
              Ir a transacciones
            </Button>
          </>
        }
      >
        <p>
          El saldo de {parentAccount?.name} en {fromCurrency} no alcanza: tenés{' '}
          {formatMoney(fromBalance?.balance ?? 0, fromCurrency)} y el pago sale{' '}
          {formatMoney(fromAmount, fromCurrency)}.
        </p>
      </Modal>
    </>
  );

  // ── Estados ──────────────────────────────────────────────────────────────
  // Abierto (aún no cerró): sin botones. Es del ciclo, así que vale para todos los renglones.
  if (!data.closed) {
    return <p className="text-sm text-body">El resumen cierra el {formatDate(data.periodEnd)}</p>;
  }

  // Cerrado + no pagado + sin deuda pendiente: ✓ derivado o "nada que pagar".
  if (!line.paid && line.remainingToPay <= 0) {
    if (line.closingBalance >= 0) {
      return <p className="text-sm text-muted">No hay nada que pagar</p>;
    }
    // Hubo deuda al cierre pero pagos posteriores la cubrieron → ✓ derivado (sin marca, no
    // clickeable; se deshace borrando la transfer en Movimientos).
    return (
      <span className="flex items-center gap-1 text-sm text-income">
        <CheckCircleIcon className="h-4 w-4" /> Pagado
      </span>
    );
  }

  const btnBase =
    'flex h-9 w-9 items-center justify-center rounded-md border transition-colors disabled:opacity-50';
  const noBtn = line.paid
    ? 'border-line text-muted hover:border-expense/40 hover:bg-expense/10 hover:text-expense'
    : 'border-expense/40 bg-expense/10 text-expense';
  const yesBtn = line.paid
    ? 'border-income/40 bg-income/10 text-income'
    : 'border-line text-muted hover:border-income/40 hover:bg-income/10 hover:text-income';

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label={`No pagado · compras en ${lineNoun}`}
        aria-pressed={!line.paid}
        onClick={line.paid ? onUnmark : undefined}
        disabled={busy || !line.paid}
        className={`${btnBase} ${noBtn}`}
      >
        <XIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label={`Pagado · compras en ${lineNoun}`}
        aria-pressed={line.paid}
        onClick={line.paid ? undefined : onTick}
        disabled={busy || line.paid}
        className={`${btnBase} ${yesBtn}`}
      >
        <CheckCircleIcon className="h-4 w-4" />
      </button>
      {dialogs}
    </div>
  );
}
