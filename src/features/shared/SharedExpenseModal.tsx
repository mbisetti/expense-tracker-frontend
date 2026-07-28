import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/toastContext';
import { formatMoney } from '../../lib/money';
import { formatDate, useDateFormat } from '../../lib/dateFormat';
import { useAccounts } from '../accounts/useAccounts';
import { useShares, useSettleShare, useUnsettleShare } from './useShared';
import { sharedErrorMessage } from './errorMessages';
import { SettleDialog } from './SettleDialog';
import type { Share } from './api';

type SharedExpenseModalProps = {
  open: boolean;
  transactionId: string;
  onClose: () => void;
};

// El detalle de un gasto compartido (el que abre la ⓘ del feed). Un tick por persona: tildar
// pregunta a qué cuenta entró la plata y crea el movimiento; destildar lo borra.
export function SharedExpenseModal({ open, transactionId, onClose }: SharedExpenseModalProps) {
  const [settling, setSettling] = useState<Share | null>(null);

  const toast = useToast();
  const { pref: dateFmt } = useDateFormat();
  const { data, isPending, isError } = useShares(open ? transactionId : undefined);
  const { data: accounts } = useAccounts();
  const settle = useSettleShare();
  const unsettle = useUnsettleShare();

  const accountName = (id: string | null) =>
    id ? accounts?.find((a) => a.id === id)?.name ?? '—' : '—';

  const toggle = (share: Share) => {
    if (share.settled) {
      unsettle.mutate(share.id, {
        onSuccess: () => toast.success('Cobro deshecho.'),
        onError: (error) => toast.error(sharedErrorMessage(error)),
      });
      return;
    }
    setSettling(share);
  };

  const pending = (data?.shares ?? []).filter((s) => !s.settled);
  const owed = pending.reduce((sum, s) => sum + s.amount, 0);

  return (
    <>
      <Modal open={open} onClose={onClose} title={data?.description || 'Gasto compartido'}>
        {isPending && <Skeleton variant="list" rows={4} />}

        {isError && (
          <p role="alert" className="text-expense">
            No pudimos cargar el reparto. Intentá de nuevo.
          </p>
        )}

        {data && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1 text-sm">
              <div className="flex justify-between">
                <span className="text-body">Total pagado</span>
                <span className="font-semibold tabular-nums text-ink">
                  {formatMoney(data.totalAmount, data.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-body">Te corresponde</span>
                <span className="font-semibold tabular-nums text-ink">
                  {formatMoney(data.yourAmount, data.currency)}
                </span>
              </div>
              <p className="text-xs text-muted">{formatDate(data.date, dateFmt)}</p>
            </div>

            <ul className="flex flex-col gap-1 border-t border-line pt-3">
              {data.shares.map((share) => (
                <li key={share.id} className="flex items-center gap-3 py-1">
                  <input
                    type="checkbox"
                    id={`share-check-${share.id}`}
                    checked={share.settled}
                    onChange={() => toggle(share)}
                    disabled={settle.isPending || unsettle.isPending}
                    className="h-4 w-4 shrink-0 accent-brand"
                  />
                  <label
                    htmlFor={`share-check-${share.id}`}
                    className="flex flex-1 flex-wrap items-baseline justify-between gap-x-3 text-sm"
                  >
                    <span className="text-ink">{share.personName}</span>
                    <span className="flex items-baseline gap-3">
                      {share.settled && (
                        <span className="text-xs text-muted">
                          {accountName(share.settlementAccountId)}
                          {share.settlementDate && ` · ${formatDate(share.settlementDate, dateFmt)}`}
                        </span>
                      )}
                      <span
                        className={`tabular-nums ${share.settled ? 'text-muted line-through' : 'text-ink'}`}
                      >
                        {formatMoney(share.amount, data.currency)}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>

            <div className="flex justify-between border-t border-line pt-3 text-sm">
              <span className="text-body">Te deben</span>
              <span className="font-semibold tabular-nums text-ink">
                {formatMoney(owed, data.currency)}
              </span>
            </div>
          </div>
        )}
      </Modal>

      {settling && (
        <SettleDialog
          open
          personName={settling.personName}
          amount={settling.amount}
          currency={data?.currency ?? ''}
          loading={settle.isPending}
          onCancel={() => setSettling(null)}
          onConfirm={(input) =>
            settle.mutate(
              { shareId: settling.id, input },
              {
                onSuccess: () => {
                  toast.success('Cobro registrado.');
                  setSettling(null);
                },
                onError: (error) => toast.error(sharedErrorMessage(error)),
              },
            )
          }
        />
      )}
    </>
  );
}
