import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { CheckCircleIcon, XIcon } from '../../components/ui/icons';
import { useToast } from '../../components/ui/toastContext';
import { formatMoney } from '../../lib/money';
import { useMarkStatementPaid, useUnmarkStatementPaid } from './useStatementPaid';
import type { Account, Statement } from './api';

type StatementPaidToggleProps = {
  card: Account;
  data: Statement;
  /** Madre (BANK/WALLET) si la tarjeta está vinculada; sin ella no se ofrece pagar de verdad. */
  parentAccount?: Account;
};

type DialogKind = 'none' | 'choose' | 'confirmMark' | 'crossCurrency' | 'insufficient' | 'undo';

function formatDate(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Sprint 22.4: widget "Pagar resumen" del detalle. Estados por ciclo navegado (A.1.2):
// abierto → texto; cerrado sin deuda → "nada que pagar"; cerrado cubierto por pagos → ✓
// derivado (no clickeable); cerrado con deuda → ✗ + tick; pagado (marca viva) → ✓ (deshace).
// El tick de una vinculada ofrece pagar de verdad (transfer madre→tarjeta) o marcar cosmético.
export function StatementPaidToggle({ card, data, parentAccount }: StatementPaidToggleProps) {
  const [dialog, setDialog] = useState<DialogKind>('none');
  const mark = useMarkStatementPaid(card.id);
  const unmark = useUnmarkStatementPaid(card.id);
  const toast = useToast();
  const navigate = useNavigate();

  const busy = mark.isPending || unmark.isPending;
  const isLinked = !!parentAccount;
  const amountLabel = formatMoney(data.remainingToPay, data.currency);
  // Sub-balance de la madre en la moneda de la tarjeta (CREDIT es mono-moneda).
  const parentBalance = (parentAccount?.balances ?? []).find((b) => b.currency === data.currency);

  function close() {
    setDialog('none');
  }

  function doPay() {
    mark.mutate(
      { periodEnd: data.periodEnd, pay: true },
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
      { periodEnd: data.periodEnd, pay: false },
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
      { periodEnd: data.periodEnd },
      {
        onSuccess: () => {
          close();
          toast.success(data.paidWithTransfer ? 'Pago deshecho' : 'Marca deshecha');
        },
        onError: () => {
          close();
          toast.error('No pudimos deshacer. Intentá de nuevo.');
        },
      },
    );
  }

  // "Pagar desde {madre}": valida moneda y saldo en el front antes de disparar la transfer.
  function onChoosePay() {
    if (!parentBalance) {
      setDialog('crossCurrency');
      return;
    }
    if (parentBalance.balance < data.remainingToPay) {
      setDialog('insufficient');
      return;
    }
    doPay();
  }

  // El tick (estado pendiente): vinculada → elegir pagar/marcar; suelta → confirmar marca.
  function onTick() {
    setDialog(isLinked ? 'choose' : 'confirmMark');
  }

  // La cruz (estado pagado): pago real pide confirmación (borra la transfer); cosmética directo.
  function onUnmark() {
    if (data.paidWithTransfer) {
      setDialog('undo');
    } else {
      doUndo();
    }
  }

  const dialogs = (
    <>
      <Modal
        open={dialog === 'choose'}
        onClose={close}
        title="Pagar resumen"
        disableClose={busy}
        footer={
          <div className="flex w-full flex-col gap-2">
            <Button variant="primary" onClick={onChoosePay} loading={mark.isPending}>
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
        <p>
          <strong>Pagar desde {parentAccount?.name}</strong> crea una transferencia por{' '}
          {amountLabel} (lo gastado después del cierre no se incluye).{' '}
          <strong>Marcar como pagado</strong> solo lo marca, sin mover plata.
        </p>
      </Modal>

      <ConfirmDialog
        open={dialog === 'confirmMark'}
        title="Marcar como pagado"
        message="Esto solo marca el resumen como pagado — no mueve plata ni cambia tus saldos. Usalo si ya lo pagaste por fuera de la app."
        confirmLabel="Marcar"
        cancelLabel="Cancelar"
        onConfirm={doMark}
        onCancel={close}
        loading={mark.isPending}
      />

      <ConfirmDialog
        open={dialog === 'undo'}
        title="Deshacer el pago"
        message="Se va a borrar la transferencia del pago y la deuda del resumen vuelve. ¿Seguro?"
        confirmLabel="Deshacer"
        cancelLabel="Cancelar"
        danger
        onConfirm={doUndo}
        onCancel={close}
        loading={unmark.isPending}
      />

      <Modal
        open={dialog === 'crossCurrency'}
        onClose={close}
        title="Pago en otra moneda"
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
          No trabajamos con pagos en otra moneda todavía. {parentAccount?.name} no tiene saldo
          en {data.currency}. Registralo desde Movimientos.
        </p>
      </Modal>

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
          El saldo de {parentAccount?.name} no alcanza: tenés{' '}
          {formatMoney(parentBalance?.balance ?? 0, data.currency)}, el resumen es {amountLabel}.
        </p>
      </Modal>
    </>
  );

  // ── Estados ──────────────────────────────────────────────────────────────
  // Abierto (aún no cerró): sin botones.
  if (!data.closed) {
    return <p className="text-sm text-body">El resumen cierra el {formatDate(data.periodEnd)}</p>;
  }

  // Cerrado + no pagado + sin deuda pendiente: ✓ derivado o "nada que pagar".
  if (!data.paid && data.remainingToPay <= 0) {
    if (data.closingBalance >= 0) {
      return <p className="text-sm text-muted">No hay nada que pagar</p>;
    }
    // Hubo deuda al cierre pero pagos posteriores la cubrieron → ✓ derivado (sin marca, no
    // clickeable; se deshace borrando la transfer en Movimientos).
    return (
      <div className="flex flex-col items-start gap-1.5 sm:items-end">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">Pagar resumen</span>
        <span className="flex items-center gap-1 text-sm text-income">
          <CheckCircleIcon className="h-4 w-4" /> Pagado
        </span>
      </div>
    );
  }

  const btnBase =
    'flex h-9 w-9 items-center justify-center rounded-md border transition-colors disabled:opacity-50';
  const noBtn = data.paid
    ? 'border-line text-muted hover:border-expense/40 hover:bg-expense/10 hover:text-expense'
    : 'border-expense/40 bg-expense/10 text-expense';
  const yesBtn = data.paid
    ? 'border-income/40 bg-income/10 text-income'
    : 'border-line text-muted hover:border-income/40 hover:bg-income/10 hover:text-income';

  return (
    <div className="flex flex-col items-start gap-1.5 sm:items-end">
      <span className="text-xs font-medium uppercase tracking-wide text-muted">Pagar resumen</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="No pagado"
          aria-pressed={!data.paid}
          onClick={data.paid ? onUnmark : undefined}
          disabled={busy || !data.paid}
          className={`${btnBase} ${noBtn}`}
        >
          <XIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Pagado"
          aria-pressed={data.paid}
          onClick={data.paid ? undefined : onTick}
          disabled={busy || data.paid}
          className={`${btnBase} ${yesBtn}`}
        >
          <CheckCircleIcon className="h-4 w-4" />
        </button>
      </div>
      {dialogs}
    </div>
  );
}
