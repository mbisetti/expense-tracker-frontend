import { Card } from '../../components/ui/Card';
import { Amount } from '../../components/ui/Amount';
import { EditButton } from '../../components/ui/ActionsMenu';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatMoney } from '../../lib/money';
import { useIncomeEntries } from './useIncomeEntries';
import type { IncomeEntryListItem } from './api';

function formatDate(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
  });
}

type Props = {
  /** S36 (FR-9): el lápiz abre la edición; el Borrar vive dentro de ese form. */
  onEdit?: (entry: IncomeEntryListItem) => void;
};

export function IncomeEntryList({ onEdit }: Props = {}) {
  const { data, isPending, isError } = useIncomeEntries();

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
                <p className="text-ink">
                  {entry.sourceName}
                  {/* S36 (D5): el concepto es lo que hace reconocible a un extra. */}
                  {entry.concept && <span className="text-body"> · {entry.concept}</span>}
                </p>
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
                {onEdit && (
                  <EditButton
                    label={`ingreso de ${entry.sourceName}`}
                    onClick={() => onEdit(entry)}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
