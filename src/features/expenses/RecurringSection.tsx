import { useState } from 'react';
import { Amount } from '../../components/ui/Amount';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { formatMoney } from '../../lib/money';
import { useRecurringExpenses } from './useRecurringExpenses';
import { RecurringExpenseForm } from './RecurringExpenseForm';
import { RecurringDetailModal } from './RecurringDetailModal';
import { dueLabel, stateBadge } from './recurringFormat';
import type { CurrencyExpenses, RecurringExpense, RecurringItem, RecurringSummary } from './api';

const EMPTY_SUMMARY: RecurringSummary = {
  committedTotal: 0,
  paidTotal: 0,
  pendingTotal: 0,
  nonEssentialCommittedTotal: 0,
  items: [],
};

type FormState = { existing?: RecurringExpense } | null;
type DetailState = { recurring: RecurringExpense; item?: RecurringItem } | null;

function Stat({ label, amount, currency, tone }: { label: string; amount: number; currency: string; tone: 'neutral' | 'income' | 'expense' }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted">{label}</span>
      <Amount amount={amount} currency={currency} tone={tone} size="sm" />
    </div>
  );
}

function ItemRow({ item, currency, onClick }: { item: RecurringItem; currency: string; onClick: () => void }) {
  const badge = stateBadge(item);
  // Sprint 24.4: cuenta de débito borrada (FK SET NULL) → el flag quedó sin cuenta.
  const needsAccount = item.autoDebit && !item.debitAccountId;
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm text-ink">{item.name}</span>
          <span className="text-xs text-muted">
            {dueLabel(item)}
            {item.autoDebit && <> · Auto</>}
            {item.installmentsTotal != null && (
              <> · cuota {Math.min(item.installmentsPaid, item.installmentsTotal)}/{item.installmentsTotal}</>
            )}
          </span>
          {needsAccount && (
            <span className="text-xs text-warning">Configurá la cuenta de débito</span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {item.failedCount > 0 && <Badge status="warning" label="Sin saldo" />}
          <Badge status={badge.status} label={badge.label} />
          <Amount amount={item.amount} currency={currency} tone="neutral" size="sm" />
        </div>
      </button>
    </li>
  );
}

export function RecurringSection({ data }: { data: CurrencyExpenses }) {
  const currency = data.currency;
  const summary = data.recurring ?? EMPTY_SUMMARY;
  const { data: allRecurring } = useRecurringExpenses();

  const [form, setForm] = useState<FormState>(null);
  const [detail, setDetail] = useState<DetailState>(null);
  const [showInactive, setShowInactive] = useState(false);

  const inactive = (allRecurring ?? []).filter((r) => !r.active && r.currency === currency);

  const recurringPct = data.total > 0 ? Math.round((summary.committedTotal / data.total) * 100) : 0;

  const openItem = (item: RecurringItem) => {
    const rec = allRecurring?.find((r) => r.id === item.id);
    if (rec) setDetail({ recurring: rec, item });
  };

  const openInactive = (rec: RecurringExpense) => setDetail({ recurring: rec });

  const startEdit = (rec: RecurringExpense) => {
    setDetail(null);
    setForm({ existing: rec });
  };

  return (
    // S29.1: solo el body — la card y el h2 los pone el <Section> colapsable de la página.
    // El botón "Nuevo" bajó del header (que ahora es el toggle) al cuerpo.
    <div className="flex flex-col gap-3">
      {summary.items.length === 0 ? (
        <div className="flex flex-col items-start gap-2 py-2">
          <p className="text-sm text-body">
            Declará tus suscripciones, alquiler, servicios y cuotas para ver cuánto tenés comprometido cada mes.
          </p>
          <Button type="button" variant="secondary" onClick={() => setForm({})}>
            Nuevo
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Stat label="Comprometido" amount={summary.committedTotal} currency={currency} tone="neutral" />
            <Stat label="Pagado" amount={summary.paidTotal} currency={currency} tone="neutral" />
            <Stat label="Pendiente" amount={summary.pendingTotal} currency={currency} tone="neutral" />
          </div>

          <p className="text-sm text-muted">
            {recurringPct}% de tu gasto del mes es recurrente.
            {summary.nonEssentialCommittedTotal > 0 && (
              <>
                {' '}De esto,{' '}
                <span className="text-warning">{formatMoney(summary.nonEssentialCommittedTotal, currency)}</span>{' '}
                es no esencial.
              </>
            )}
          </p>

          <ul className="m-0 flex list-none flex-col p-0">
            {summary.items.map((item) => (
              <ItemRow key={item.id} item={item} currency={currency} onClick={() => openItem(item)} />
            ))}
          </ul>

          <div>
            <Button type="button" variant="secondary" onClick={() => setForm({})}>
              Nuevo
            </Button>
          </div>
        </>
      )}

      {inactive.length > 0 && (
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => setShowInactive((s) => !s)}
            className="self-start text-sm text-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            aria-expanded={showInactive}
          >
            {showInactive ? '▾' : '▸'} Inactivos ({inactive.length})
          </button>
          {showInactive && (
            <ul className="m-0 flex list-none flex-col p-0">
              {inactive.map((rec) => (
                <li key={rec.id}>
                  <button
                    type="button"
                    onClick={() => openInactive(rec)}
                    className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-sm text-muted hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <span className="truncate">{rec.name}</span>
                    <Amount amount={rec.amount} currency={rec.currency} tone="neutral" size="sm" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {form && (
        <RecurringExpenseForm
          open
          defaultCurrency={currency}
          existing={form.existing}
          onClose={() => setForm(null)}
        />
      )}

      {detail && (
        <RecurringDetailModal
          recurring={detail.recurring}
          item={detail.item}
          onClose={() => setDetail(null)}
          onEdit={startEdit}
        />
      )}
    </div>
  );
}
