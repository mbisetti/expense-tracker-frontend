import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatMoney } from '../../lib/money';
import { useCommitments } from './useCommitments';
import type { CurrencyCommitments } from './api';

// "De lo que entra este mes, ¿cuánto ya tiene dueño?"
//
// Junta las cuotas de préstamo con los recurrentes y los mide contra los ingresos esperados.
// Hasta ahora esa cuenta había que hacerla de memoria saltando entre tres pantallas.
//
// **Comprometido es el mes COMPLETO, no lo que falta pagar.** Una cuota que ya pagaste igual
// tenía dueño: la pregunta es cuánto de lo que entra está reservado, no cuánto debés todavía.
export function CommitmentsCard() {
  const now = new Date();
  const { data, isPending, isError } = useCommitments(now.getFullYear(), now.getMonth() + 1);

  if (isPending) return <Skeleton variant="list" rows={3} />;
  // Sin compromisos no hay nada que mostrar: una card vacía diciendo "$0 comprometido" es ruido
  // en el Overview de alguien que todavía no cargó ni un recurrente.
  if (isError || !data?.byCurrency?.length) return null;

  return (
    <Card>
      <h2>Compromisos del mes</h2>
      <p className="text-sm text-body">
        Plata que ya está reservada antes de gastar nada: cuotas de préstamos y gastos
        recurrentes.
      </p>

      <div className="mt-3 flex flex-col gap-5">
        {data.byCurrency.map((c) => (
          <CurrencyBlock key={c.currency} commitments={c} />
        ))}
      </div>
    </Card>
  );
}

function CurrencyBlock({ commitments: c }: { commitments: CurrencyCommitments }) {
  const [open, setOpen] = useState(false);
  // Negativo = los compromisos se comen más de lo que entra. Es el caso que hay que mostrar
  // fuerte, no esconder.
  const overCommitted = c.freeAmount !== null && c.freeAmount < 0;

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-ink">{c.currency}</span>
        <span className="text-lg font-semibold tabular-nums text-ink">
          {formatMoney(c.committedTotal, c.currency)}
        </span>
      </div>

      {c.freeAmount !== null ? (
        <p className={`text-sm ${overCommitted ? 'text-expense' : 'text-body'}`}>
          {overCommitted ? (
            <>
              Te faltan{' '}
              <span className="font-semibold tabular-nums">
                {formatMoney(Math.abs(c.freeAmount), c.currency)}
              </span>{' '}
              para cubrir los compromisos con lo que esperás cobrar.
            </>
          ) : (
            <>
              De tus ingresos del mes queda libre{' '}
              <span className="font-semibold tabular-nums text-ink">
                {formatMoney(c.freeAmount, c.currency)}
              </span>
              .
            </>
          )}
        </p>
      ) : (
        // Sin fuentes de ingreso cargadas no se puede decir cuánto queda libre, y estimarlo sería
        // inventar. Se dice qué falta para que el número aparezca.
        <p className="text-sm text-muted">
          Cargá tus <Link to="/income" className="text-brand underline-offset-2 hover:underline">
            ingresos esperados
          </Link>{' '}
          para ver cuánto te queda libre.
        </p>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="self-start text-sm text-brand underline-offset-2 hover:underline"
      >
        {open ? 'Ocultar el detalle' : `Ver el detalle (${c.items.length})`}
      </button>

      {open && (
        <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
          {c.items.map((item) => (
            <li
              key={`${item.kind}-${item.id}`}
              className="flex items-center justify-between gap-3 py-1.5"
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm text-ink">{item.name}</span>
                <span className="text-xs text-muted">
                  {item.detail ?? (item.kind === 'LOAN' ? 'Préstamo' : 'Recurrente')}
                </span>
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">
                {formatMoney(item.amount, c.currency)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Los dos orígenes por separado: es plata que se comporta distinto (una cuota se termina,
          el alquiler no) y que se administra en pantallas distintas. */}
      {c.loansTotal > 0 && c.recurringTotal > 0 && (
        <p className="text-xs text-muted">
          <Link to="/accounts" className="text-brand underline-offset-2 hover:underline">
            Préstamos
          </Link>{' '}
          {formatMoney(c.loansTotal, c.currency)} ·{' '}
          <Link
            to="/expenses#recurrentes"
            className="text-brand underline-offset-2 hover:underline"
          >
            Recurrentes
          </Link>{' '}
          {formatMoney(c.recurringTotal, c.currency)}
        </p>
      )}
    </section>
  );
}
