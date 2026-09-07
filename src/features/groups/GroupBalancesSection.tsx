import { useState } from 'react';
import { Amount } from '../../components/ui/Amount';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Skeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/toastContext';
import { formatMoney } from '../../lib/money';
import { groupErrorMessage } from './errorMessages';
import { useGroupBalances, useSettleGroup } from './useGroupSettlements';
import type { PairBalance } from './api';

type GroupBalancesSectionProps = {
  groupId: string;
};

export function GroupBalancesSection({ groupId }: GroupBalancesSectionProps) {
  const toast = useToast();
  const { data: balances, isPending, isError } = useGroupBalances(groupId);
  const settle = useSettleGroup();
  const [settling, setSettling] = useState<PairBalance | null>(null);

  const confirmSettle = () => {
    if (!settling) return;
    settle.mutate(
      {
        groupId,
        input: {
          fromMemberId: settling.fromMemberId,
          toMemberId: settling.toMemberId,
          amount: settling.amount,
          currency: settling.currency,
        },
      },
      {
        onSuccess: () => toast.success('Pago anotado.'),
        onError: (error) => toast.error(groupErrorMessage(error)),
        onSettled: () => setSettling(null),
      },
    );
  };

  // La sugerencia sólo vale la pena si de verdad ahorra pagos. Mostrar "con 2 pagos en vez de 2"
  // es ocupar media pantalla para no decir nada.
  const worthSimplifying =
    balances?.simplifyEnabled &&
    balances.simplified.length > 0 &&
    balances.simplified.length < balances.pairwise.length;

  return (
    <Card header={<h2 className="text-base font-semibold text-ink">Saldos</h2>}>
      {isPending && <Skeleton variant="list" rows={2} />}

      {isError && (
        <p role="alert" className="text-expense">
          No pudimos cargar los saldos del grupo.
        </p>
      )}

      {balances && balances.pairwise.length === 0 && (
        <p className="text-sm text-muted">Están todos a mano.</p>
      )}

      {balances && balances.pairwise.length > 0 && (
        <div className="flex flex-col gap-4">
          <ul className="flex flex-col gap-2">
            {balances.pairwise.map((row) => (
              <li
                key={`${row.fromMemberId}-${row.toMemberId}-${row.currency}`}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <span className="text-ink">
                  {row.fromName} le debe a {row.toName}
                </span>
                <div className="flex items-center gap-3">
                  <Amount amount={row.amount} currency={row.currency} tone="expense" size="sm" />
                  <Button type="button" variant="secondary" size="sm" onClick={() => setSettling(row)}>
                    Saldar
                  </Button>
                </div>
              </li>
            ))}
          </ul>

          {worthSimplifying && (
            <div className="rounded-md border border-line bg-surface-sunken p-3">
              <p className="text-sm text-ink">
                Con {balances.simplified.length}{' '}
                {balances.simplified.length === 1 ? 'pago' : 'pagos'} en vez de{' '}
                {balances.pairwise.length} quedan todos en cero.
              </p>
              <ul className="mt-2 flex flex-col gap-1">
                {balances.simplified.map((row) => (
                  <li
                    key={`s-${row.fromMemberId}-${row.toMemberId}-${row.currency}`}
                    className="text-sm text-muted"
                  >
                    {row.fromName} le paga {formatMoney(row.amount, row.currency)} a {row.toName}
                  </li>
                ))}
              </ul>
              {/* Es información, no un botón: anotar un pago que no coincide con una deuda
                  concreta exigiría partir una deuda al medio, y eso todavía no existe. */}
              <p className="mt-2 text-sm text-muted">
                Si lo hacen así, anoten cada pago desde la lista de arriba.
              </p>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={settling !== null}
        title="Anotar el pago"
        message={
          settling
            ? `${settling.fromName} le pagó ${formatMoney(settling.amount, settling.currency)} a ${settling.toName}. Se anota en la cuenta que cada uno eligió para el grupo.`
            : ''
        }
        confirmLabel="Anotar"
        loading={settle.isPending}
        onConfirm={confirmSettle}
        onCancel={() => setSettling(null)}
      />
    </Card>
  );
}
