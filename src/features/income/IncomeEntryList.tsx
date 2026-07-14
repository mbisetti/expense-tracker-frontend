import { Card } from '../../components/Card';
import { PlaceholderRow } from '../../components/SectionPlaceholder';
import { formatMoney } from '../../lib/money';
import { useIncomeEntries } from './useIncomeEntries';
import { useDeleteIncomeEntry } from './useIncomeMutations';

function formatDate(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
  });
}

export function IncomeEntryList() {
  const { data, isPending, isError } = useIncomeEntries();
  const deleteMutation = useDeleteIncomeEntry();

  return (
    <Card>
      <h2>Ingresos recientes</h2>

      {isPending && (
        <div role="status" aria-label="Cargando ingresos" className="flex flex-col gap-3">
          <PlaceholderRow />
          <PlaceholderRow />
        </div>
      )}

      {isError && <p role="alert">No pudimos cargar los ingresos. Intentá de nuevo.</p>}

      {data && data.content.length === 0 && <p>Todavía no registraste ingresos.</p>}

      {data && data.content.length > 0 && (
        <ul className="list-none p-0 m-0 divide-y divide-line">
          {data.content.map((entry) => (
            <li key={entry.id} className="flex justify-between items-center gap-3 py-2">
              <div>
                <p className="text-ink">{entry.sourceName}</p>
                <p className="text-body text-sm">
                  {formatDate(entry.date)}
                  {entry.notes ? ` · ${entry.notes}` : ''}
                  {entry.deductions.length > 0 &&
                    ` · bruto ${formatMoney(entry.grossAmount, entry.currency)} − ${entry.deductions.length} deducc.`}
                  {entry.netOverridden && ' · neto manual'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-income tabular-nums">
                  +{formatMoney(entry.netAmount, entry.currency)}
                </span>
                <button
                  type="button"
                  className="text-sm text-expense"
                  onClick={() => deleteMutation.mutate(entry.id)}
                  disabled={deleteMutation.isPending}
                >
                  Borrar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
