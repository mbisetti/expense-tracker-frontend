import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Amount } from '../../components/ui/Amount';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/toastContext';
import { formatMoney } from '../../lib/money';
import { useIncomeEntries } from './useIncomeEntries';
import { useDeleteIncomeEntry } from './useIncomeMutations';
import { incomeErrorMessage } from './errorMessages';

function formatDate(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
  });
}

export function IncomeEntryList() {
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const toast = useToast();
  const { data, isPending, isError } = useIncomeEntries();
  const deleteMutation = useDeleteIncomeEntry();

  const confirmDelete = () => {
    if (!confirmingDeleteId) return;
    deleteMutation.mutate(confirmingDeleteId, {
      onSuccess: () => toast.success('Ingreso borrado.'),
      onError: (error) => toast.error(incomeErrorMessage(error)),
      onSettled: () => setConfirmingDeleteId(null),
    });
  };

  return (
    <Card>
      <h2>Ingresos recientes</h2>

      {isPending && <Skeleton variant="list" rows={2} />}

      {isError && (
        <p role="alert" className="text-expense">
          No pudimos cargar los ingresos. Intentá de nuevo.
        </p>
      )}

      {data && data.content.length === 0 && (
        <EmptyState title="Todavía no registraste ingresos." />
      )}

      {data && data.content.length > 0 && (
        <ul className="list-none p-0 m-0 divide-y divide-line">
          {data.content.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between gap-3 py-2">
              <div>
                <p className="text-ink">{entry.sourceName}</p>
                <p className="text-sm text-body">
                  {formatDate(entry.date)}
                  {entry.notes ? ` · ${entry.notes}` : ''}
                  {entry.deductions.length > 0 &&
                    ` · bruto ${formatMoney(entry.grossAmount, entry.currency)} − ${entry.deductions.length} deducc.`}
                  {entry.netOverridden && ' · neto manual'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Amount amount={entry.netAmount} currency={entry.currency} tone="income" size="sm" />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmingDeleteId(entry.id)}
                >
                  Borrar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={confirmingDeleteId !== null}
        danger
        title="Borrar ingreso"
        message="Esta acción no se puede deshacer."
        confirmLabel="Borrar"
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmingDeleteId(null)}
      />
    </Card>
  );
}
