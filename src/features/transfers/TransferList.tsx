import { Card } from '../../components/Card';
import { PlaceholderRow } from '../../components/SectionPlaceholder';
import { formatMoney } from '../../lib/money';
import { useAccounts } from '../accounts/useAccounts';
import { useTransfers } from './useTransfers';
import { useDeleteTransfer } from './useTransferMutations';

function formatDate(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
  });
}

export function TransferList() {
  const { data, isPending, isError } = useTransfers();
  const { data: accounts } = useAccounts();
  const deleteMutation = useDeleteTransfer();

  const accountName = (id: string) => accounts?.find((a) => a.id === id)?.name ?? '—';
  // moneda derivada de la cuenta (MVP misma moneda: origen y destino coinciden)
  const currencyOf = (id: string) => accounts?.find((a) => a.id === id)?.currency;

  return (
    <Card>
      <h2>Transferencias recientes</h2>

      {isPending && (
        <div role="status" aria-label="Cargando transferencias" className="flex flex-col gap-3">
          <PlaceholderRow />
          <PlaceholderRow />
        </div>
      )}

      {isError && <p role="alert">No pudimos cargar las transferencias. Intentá de nuevo.</p>}

      {data && data.content.length === 0 && <p>Todavía no hiciste transferencias.</p>}

      {data && data.content.length > 0 && (
        <ul className="list-none p-0 m-0 divide-y divide-line">
          {data.content.map((transfer) => {
            const currency = currencyOf(transfer.fromAccountId);
            return (
              <li key={transfer.id} className="flex justify-between items-center gap-3 py-2">
                <div>
                  <p className="text-ink">
                    {accountName(transfer.fromAccountId)} → {accountName(transfer.toAccountId)}
                  </p>
                  <p className="text-body text-sm">
                    {formatDate(transfer.date)}
                    {transfer.description ? ` · ${transfer.description}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-ink tabular-nums">
                    {currency
                      ? formatMoney(transfer.amount, currency)
                      : transfer.amount.toLocaleString('es-AR')}
                  </span>
                  <button
                    type="button"
                    className="text-sm text-expense"
                    onClick={() => deleteMutation.mutate(transfer.id)}
                    disabled={deleteMutation.isPending}
                  >
                    Borrar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
