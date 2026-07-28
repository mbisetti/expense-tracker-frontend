import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/toastContext';
import { formatMoney } from '../../lib/money';
import { formatDate, useDateFormat, type DateFormatPref } from '../../lib/dateFormat';
import { useSharedSummary, useSettleShare } from './useShared';
import { sharedErrorMessage } from './errorMessages';
import { SettleDialog } from './SettleDialog';
import type { PendingShareItem, PersonPending } from './api';

// Bloque de la tab Gastos. ACUMULADO a propósito: lo que te deben es una deuda viva, no un
// número mensual — Juan te debe la cena de mayo aunque estés mirando julio. Las flechas de mes
// de la página no lo tocan.
//
// Sin nada pendiente no se renderiza (ni un EmptyState): la tab Gastos ya tiene bastante.
export function SharedSection() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [settling, setSettling] = useState<{ share: PendingShareItem; person: string } | null>(null);

  const toast = useToast();
  const { pref: dateFmt } = useDateFormat();
  const { data, isPending } = useSharedSummary();
  const settle = useSettleShare();

  if (isPending) return <Skeleton variant="list" rows={3} />;
  // `?.` y no `data.people.length`: el bloque se monta dentro de la tab Gastos, que puede
  // renderizarse con la respuesta a medias o vacía. Sin nada pendiente no se dibuja nada — ni
  // un EmptyState, la tab ya tiene bastante.
  if (!data?.people?.length) return null;

  const toggle = (personId: string) => setExpanded((id) => (id === personId ? null : personId));

  return (
    <>
      {/* S29.1: solo el body — la card y el h2 los pone el <Section> colapsable de la página. */}
      <ul className="flex flex-col divide-y divide-line">
        {data.people.map((person) => (
          <PersonRow
            key={person.personId}
            person={person}
            expanded={expanded === person.personId}
            onToggle={() => toggle(person.personId)}
            onSettle={(share) => setSettling({ share, person: person.name })}
            dateFmt={dateFmt}
          />
        ))}
      </ul>

      {settling && (
        <SettleDialog
          open
          personName={settling.person}
          amount={settling.share.amount}
          currency={settling.share.currency}
          loading={settle.isPending}
          onCancel={() => setSettling(null)}
          onConfirm={(input) =>
            settle.mutate(
              { shareId: settling.share.shareId, input },
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

type PersonRowProps = {
  person: PersonPending;
  expanded: boolean;
  onToggle: () => void;
  onSettle: (share: PendingShareItem) => void;
  dateFmt: DateFormatPref;
};

function PersonRow({ person, expanded, onToggle, onSettle, dateFmt }: PersonRowProps) {
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
          {/* Sin esto, colapsado sólo se ve un nombre y un número: no se sabe si son diez cafés
              o una cena. */}
          <span className="block text-xs text-muted">
            {person.shares.length} {person.shares.length === 1 ? 'gasto' : 'gastos'}
          </span>
        </span>
        <span className="flex items-baseline gap-2">
          {/* Una línea por moneda: la app no consolida en ningún lado y acá tampoco. */}
          {person.pending.map((p) => (
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
          {person.shares.map((share) => (
            <li key={share.shareId} className="flex items-center gap-3 py-2">
              {/* De qué es la deuda va primero y con la voz de un título: sin esto la lista era
                  una columna de fechas y montos donde no se entendía qué te debían. */}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-ink" title={share.description ?? ''}>
                  {share.description ?? 'Gasto sin descripción'}
                </div>
                <div className="text-xs text-muted">{formatDate(share.date, dateFmt)}</div>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">
                {formatMoney(share.amount, share.currency)}
              </span>
              <Button type="button" variant="ghost" size="sm" onClick={() => onSettle(share)}>
                Cobrar
              </Button>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
