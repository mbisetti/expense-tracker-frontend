import { useState, type ReactNode } from 'react';
import { Amount } from '../../components/ui/Amount';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { formatMoney } from '../../lib/money';
import { useRecurringExpenses } from './useRecurringExpenses';
import { RecurringExpenseForm } from './RecurringExpenseForm';
import { RecurringDetailModal } from './RecurringDetailModal';
import { MarkRecurringPaidModal } from './MarkRecurringPaidModal';
import { defaultPaidDate, dueLabel, stateBadge } from './recurringFormat';
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
type PayState = { recurring: RecurringExpense; date: string } | null;

// Débito automático vs "los pagás vos": son dos cosas distintas y hasta ahora convivían en una
// sola lista, separadas por un "· Auto" en gris (reporte de Marko). Ahora van en grupos, con
// un filtro cuando hay de los dos.
type Filter = 'all' | 'auto' | 'manual';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'auto', label: 'Automáticos' },
  { value: 'manual', label: 'Manuales' },
];

function todayLocal(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

function Stat({ label, amount, currency, tone }: { label: string; amount: number; currency: string; tone: 'neutral' | 'income' | 'expense' }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted">{label}</span>
      <Amount amount={amount} currency={currency} tone={tone} size="sm" />
    </div>
  );
}

function ItemRow({
  item,
  currency,
  onClick,
  onPay,
}: {
  item: RecurringItem;
  currency: string;
  onClick: () => void;
  /** Presente sólo en manuales que se pueden saldar (ver payableDate). */
  onPay?: () => void;
}) {
  const badge = stateBadge(item);
  // Sprint 24.4: cuenta de débito borrada (FK SET NULL) → el flag quedó sin cuenta.
  const needsAccount = item.autoDebit && !item.debitAccountId;
  // "Pendiente" y el botón dicen lo mismo: con el botón puesto, el badge es ruido y encima
  // desborda la fila en un teléfono. En PARTIAL el badge sí aporta (el 1/2), así que se queda.
  const hideBadge = onPay != null && item.state === 'PENDING';
  return (
    <li className="flex items-center gap-1">
      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-md px-2 py-2 text-left hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm text-ink">{item.name}</span>
          <span className="text-xs text-muted">
            {dueLabel(item)}
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
          {!hideBadge && <Badge status={badge.status} label={badge.label} />}
          <Amount amount={item.amount} currency={currency} tone="neutral" size="sm" />
        </div>
      </button>
      {onPay && (
        <Button type="button" variant="secondary" size="sm" onClick={onPay}>
          Pagué
        </Button>
      )}
    </li>
  );
}

function Group({
  title,
  hint,
  items,
  currency,
  children,
}: {
  title: string;
  hint: string;
  items: RecurringItem[];
  currency: string;
  children: ReactNode;
}) {
  const total = items.reduce((sum, i) => sum + i.amount, 0);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</h3>
        <span className="tabular-nums text-xs text-muted">{formatMoney(total, currency)}</span>
      </div>
      <p className="text-xs text-muted">{hint}</p>
      <ul className="m-0 flex list-none flex-col p-0">{children}</ul>
    </div>
  );
}

export function RecurringSection({
  data,
  year,
  month,
}: {
  data: CurrencyExpenses;
  /** Período que se está mirando: define la fecha con la que se registra un pago manual. */
  year: number;
  month: number;
}) {
  const currency = data.currency;
  const summary = data.recurring ?? EMPTY_SUMMARY;
  const { data: allRecurring } = useRecurringExpenses();

  const [form, setForm] = useState<FormState>(null);
  const [detail, setDetail] = useState<DetailState>(null);
  const [pay, setPay] = useState<PayState>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [showInactive, setShowInactive] = useState(false);

  const inactive = (allRecurring ?? []).filter((r) => !r.active && r.currency === currency);

  const recurringPct = data.total > 0 ? Math.round((summary.committedTotal / data.total) * 100) : 0;

  const autoItems = summary.items.filter((i) => i.autoDebit);
  const manualItems = summary.items.filter((i) => !i.autoDebit);
  // El filtro sólo tiene sentido si hay de los dos; con una sola clase, los grupos ya alcanzan.
  const showFilter = autoItems.length > 0 && manualItems.length > 0;

  const openItem = (item: RecurringItem) => {
    const rec = allRecurring?.find((r) => r.id === item.id);
    if (rec) setDetail({ recurring: rec, item });
  };

  const openInactive = (rec: RecurringExpense) => setDetail({ recurring: rec });

  const startEdit = (rec: RecurringExpense) => {
    setDetail(null);
    setForm({ existing: rec });
  };

  // Un manual se puede saldar si todavía debe algo este mes Y tenemos su definición cargada
  // (el modal necesita categoría y moneda). NOT_DUE/PAID/COMPLETED no ofrecen nada.
  const startPay = (item: RecurringItem) => {
    const rec = allRecurring?.find((r) => r.id === item.id);
    if (!rec) return;
    setDetail(null);
    setPay({ recurring: rec, date: defaultPaidDate(year, month, item.billingDay, todayLocal()) });
  };

  const payHandler = (item: RecurringItem): (() => void) | undefined => {
    if (item.autoDebit) return undefined;
    if (item.state !== 'PENDING' && item.state !== 'PARTIAL') return undefined;
    if (!allRecurring?.some((r) => r.id === item.id)) return undefined;
    return () => startPay(item);
  };

  const renderRows = (items: RecurringItem[]) =>
    items.map((item) => (
      <ItemRow
        key={item.id}
        item={item}
        currency={currency}
        onClick={() => openItem(item)}
        onPay={payHandler(item)}
      />
    ));

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

          {showFilter && (
            <div role="tablist" aria-label="Filtrar recurrentes" className="flex flex-wrap gap-2">
              {FILTERS.map((option) => {
                const isSelected = filter === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setFilter(option.value)}
                    className={
                      isSelected
                        ? 'rounded-full border border-brand bg-brand-bg px-3 py-1 text-sm text-brand'
                        : 'rounded-full border border-line bg-transparent px-3 py-1 text-sm text-body'
                    }
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex flex-col gap-4">
            {filter !== 'manual' && autoItems.length > 0 && (
              <Group
                title="Débito automático"
                hint="Se debitan solos de la cuenta que configuraste."
                items={autoItems}
                currency={currency}
              >
                {renderRows(autoItems)}
              </Group>
            )}
            {filter !== 'auto' && manualItems.length > 0 && (
              <Group
                title="Los pagás vos"
                hint="Cuando pagues uno, marcalo con “Pagué” y queda anotado."
                items={manualItems}
                currency={currency}
              >
                {renderRows(manualItems)}
              </Group>
            )}
          </div>

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
          onPay={detail.item && payHandler(detail.item)}
        />
      )}

      {pay && (
        <MarkRecurringPaidModal
          recurring={pay.recurring}
          defaultDate={pay.date}
          onClose={() => setPay(null)}
        />
      )}
    </div>
  );
}
