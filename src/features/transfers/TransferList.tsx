import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Amount } from '../../components/ui/Amount';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/toastContext';
import { useAccounts } from '../accounts/useAccounts';
import { useTransfers } from './useTransfers';
import { useDeleteTransfer } from './useTransferMutations';
import { transferErrorMessage } from './errorMessages';

function formatDate(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
  });
}

export function TransferList() {
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const toast = useToast();
  const { data, isPending, isError } = useTransfers();
  const { data: accounts } = useAccounts();
  const deleteMutation = useDeleteTransfer();

  const accountName = (id: string) => accounts?.find((a) => a.id === id)?.name ?? '—';

  const confirmDelete = () => {
    if (!confirmingDeleteId) return;
    deleteMutation.mutate(confirmingDeleteId, {
      onSuccess: () => toast.success('Transferencia borrada.'),
      onError: (error) => toast.error(transferErrorMessage(error)),
      onSettled: () => setConfirmingDeleteId(null),
    });
  };

  return (
    <Card>
      <h2>Transferencias recientes</h2>

      {isPending && <Skeleton variant="list" rows={2} />}

      {isError && (
        <p role="alert" className="text-expense">
          No pudimos cargar las transferencias. Intentá de nuevo.
        </p>
      )}

      {data && data.content.length === 0 && (
        <EmptyState title="Todavía no hiciste transferencias." />
      )}

      {data && data.content.length > 0 && (
        <ul className="list-none p-0 m-0 divide-y divide-line">
          {data.content.map((transfer) => {
            // Sprint 22: la moneda sale del transfer, no de la cuenta (un transfer intra-cuenta
            // tiene ambas patas en la misma cuenta pero monedas distintas — derivar de la
            // cuenta escondería la segunda moneda).
            const crossCurrency = transfer.fromCurrency !== transfer.toCurrency;
            const intraAccount = transfer.fromAccountId === transfer.toAccountId;
            return (
              <li key={transfer.id} className="flex items-center justify-between gap-3 py-2">
                <div>
                  <p className="text-ink">
                    {intraAccount
                      ? `${accountName(transfer.fromAccountId)} · ${transfer.fromCurrency} → ${transfer.toCurrency}`
                      : `${accountName(transfer.fromAccountId)} → ${accountName(transfer.toAccountId)}`}
                  </p>
                  <p className="text-sm text-body">
                    {formatDate(transfer.date)}
                    {transfer.description ? ` · ${transfer.description}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular-nums text-ink">
                    <Amount amount={transfer.fromAmount} currency={transfer.fromCurrency} tone="neutral" size="sm" />
                    {crossCurrency && (
                      <>
                        {' → '}
                        <Amount amount={transfer.toAmount} currency={transfer.toCurrency} tone="neutral" size="sm" />
                      </>
                    )}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmingDeleteId(transfer.id)}
                  >
                    Borrar
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={confirmingDeleteId !== null}
        danger
        title="Borrar transferencia"
        message="Esta acción no se puede deshacer."
        confirmLabel="Borrar"
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmingDeleteId(null)}
      />
    </Card>
  );
}
