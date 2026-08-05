import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/toastContext';
import { formatMoney } from '../../lib/money';
import { formatDate, useDateFormat, type DateFormatPref } from '../../lib/dateFormat';
import { usePersonDebts, useCreatePersonDebt, useSettlePersonDebt } from './useShared';
import { sharedErrorMessage } from './errorMessages';
import { SettleDebtDialog } from './SettleDebtDialog';
import { PersonDebtForm } from './PersonDebtForm';
import type { PersonDebtItem, PersonOwed } from './api';

// S40 (D8) — "Debés": el espejo de "Te deben", debajo suyo, dentro de la misma sección
// "Hoy por vos, mañana por mí". Sin sección nueva a propósito: es la misma idea vista desde el
// otro lado, y partirla en dos lugares obligaría a mirar en dos lados para saber cómo estás con
// la misma persona.
//
// ACUMULADO, igual que su espejo: le debés a Bauti la cena de mayo aunque estés mirando julio.
// Las flechas de mes de la página no lo tocan.
export function OwedSection() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [settling, setSettling] = useState<{ debt: PersonDebtItem; person: string } | null>(null);
  const [adding, setAdding] = useState(false);

  const toast = useToast();
  const { pref: dateFmt } = useDateFormat();
  const { data, isPending } = usePersonDebts();
  const settle = useSettlePersonDebt();
  const create = useCreatePersonDebt();

  const toggle = (personId: string) => setExpanded((id) => (id === personId ? null : personId));

  const addButton = (
    <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(true)}>
      Anotar deuda
    </Button>
  );

  return (
    <div className="flex flex-col gap-2 border-t border-line pt-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">Debés</span>
        {addButton}
      </div>

      {isPending ? (
        <Skeleton variant="list" rows={2} />
      ) : !data?.people?.length ? (
        // Sin empty state con ilustración: es el bloque secundario de una sección que ya tiene
        // el suyo arriba. Una línea alcanza y el botón de anotar ya está en el header.
        <p className="text-sm text-muted">No le debés nada a nadie.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {data.people.map((person) => (
            <PersonOwedRow
              key={person.personId}
              person={person}
              expanded={expanded === person.personId}
              onToggle={() => toggle(person.personId)}
              onSettle={(debt) => setSettling({ debt, person: person.name })}
              dateFmt={dateFmt}
            />
          ))}
        </ul>
      )}

      {settling && (
        <SettleDebtDialog
          open
          personName={settling.person}
          amount={settling.debt.amount}
          currency={settling.debt.currency}
          loading={settle.isPending}
          onCancel={() => setSettling(null)}
          onConfirm={(input) =>
            settle.mutate(
              { debtId: settling.debt.debtId, input },
              {
                onSuccess: () => {
                  toast.success('Deuda saldada.');
                  setSettling(null);
                },
                onError: (error) => toast.error(sharedErrorMessage(error)),
              },
            )
          }
        />
      )}

      {adding && (
        <PersonDebtForm
          open
          loading={create.isPending}
          onCancel={() => setAdding(false)}
          onConfirm={(input) =>
            create.mutate(input, {
              onSuccess: () => {
                toast.success('Deuda anotada. El gasto cuenta desde la fecha que pusiste.');
                setAdding(false);
              },
              onError: (error) => toast.error(sharedErrorMessage(error)),
            })
          }
        />
      )}
    </div>
  );
}

type PersonOwedRowProps = {
  person: PersonOwed;
  expanded: boolean;
  onToggle: () => void;
  onSettle: (debt: PersonDebtItem) => void;
  dateFmt: DateFormatPref;
};

function PersonOwedRow({ person, expanded, onToggle, onSettle, dateFmt }: PersonOwedRowProps) {
  return (
    <li className="py-2">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="min-w-0">
          <span className="block truncate text-ink">{person.name}</span>
          <span className="block text-xs text-muted">
            {person.debts.length} {person.debts.length === 1 ? 'deuda' : 'deudas'}
          </span>
        </span>
        <span className="flex items-baseline gap-2">
          {/* Una línea por moneda: la app no consolida en ningún lado y acá tampoco. */}
          {person.owed.map((p) => (
            <span key={p.currency} className="font-semibold tabular-nums text-ink">
              {formatMoney(p.amount, p.currency)}
            </span>
          ))}
          <span aria-hidden className="text-muted">
            {expanded ? '▾' : '▸'}
          </span>
        </span>
      </button>

      {expanded && (
        <ul className="mt-1 flex flex-col divide-y divide-line/60 pl-3">
          {person.debts.map((debt) => (
            <li key={debt.debtId} className="flex items-center gap-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-ink" title={debt.description ?? ''}>
                  {debt.description ?? 'Gasto sin descripción'}
                </div>
                <div className="text-xs text-muted">
                  {formatDate(debt.date, dateFmt)}
                  {debt.categoryName ? ` · ${debt.categoryName}` : ''}
                </div>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">
                {formatMoney(debt.amount, debt.currency)}
              </span>
              <Button type="button" variant="ghost" size="sm" onClick={() => onSettle(debt)}>
                Saldar
              </Button>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
