import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { DateField } from '../../components/ui/DateField';
import { Button } from '../../components/ui/Button';
import { Amount } from '../../components/ui/Amount';
import { useToast } from '../../components/ui/toastContext';
import { formatMoney, numberToAmountDisplay, parseAmountInput } from '../../lib/money';
import { useAccounts } from '../accounts/useAccounts';
import { useIncomeSources } from './useIncomeSources';
import { useIncomeDeductions } from './useIncomeDeductions';
import { useCreateIncomeEntry, useUpdateIncomeEntry } from './useIncomeMutations';
import { previewNet } from './deductionMath';
import { incomeErrorMessage } from './errorMessages';
import { ConceptInput } from './ConceptInput';
import type { IncomeEntryListItem } from './api';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

type Props = {
  /** S36 (FR-3): entrada a editar. Ausente = alta. */
  editing?: IncomeEntryListItem | null;
  /** Cerrar el box (el padre es dueño de abrir/cerrar, FR-8). */
  onClose?: () => void;
  /** FR-9: el Borrar vive DENTRO del form de edición, en rojizo, como en el resto de la app. */
  onDelete?: (entry: IncomeEntryListItem) => void;
};

export function IncomeEntryForm({ editing, onClose, onDelete }: Props = {}) {
  const toast = useToast();
  const { data: sources } = useIncomeSources();
  const { data: accounts } = useAccounts();
  const createMutation = useCreateIncomeEntry();
  const updateMutation = useUpdateIncomeEntry();
  const isEdit = !!editing;
  const busy = createMutation.isPending || updateMutation.isPending;

  const activeSources = sources?.filter((source) => source.active) ?? [];

  const [incomeSourceId, setIncomeSourceId] = useState(editing?.incomeSourceId ?? '');
  const [accountId, setAccountId] = useState(editing?.accountId ?? '');
  const [grossAmount, setGrossAmount] = useState(
    editing ? numberToAmountDisplay(editing.grossAmount) : '',
  );
  const [date, setDate] = useState(editing?.date ?? todayIso());
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [concept, setConcept] = useState(editing?.concept ?? '');
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [overrideEnabled, setOverrideEnabled] = useState(editing?.netOverridden ?? false);
  const [netOverride, setNetOverride] = useState(
    editing?.netOverridden ? numberToAmountDisplay(editing.netAmount) : '',
  );

  // En edición no se eligen deducciones: el backend recalcula contra el snapshot de la entry
  // (cambiar la config de la fuente no puede reescribir la historia de un cobro viejo).
  const { data: deductions } = useIncomeDeductions(!isEdit && incomeSourceId ? incomeSourceId : undefined);
  const activeDeductions = useMemo(
    () => (deductions ?? []).filter((d) => d.active),
    [deductions],
  );

  // al cambiar de fuente (o al cargar sus deducciones) se tildan todas las activas
  // (lint set-state-in-effect pre-existente — no tocado en esta migración, ver reporte S19 B3)
  useEffect(() => {
    setCheckedIds(new Set(activeDeductions.map((d) => d.id)));
  }, [activeDeductions]);

  const grossNumber = parseAmountInput(grossAmount);
  const chosen = activeDeductions.filter((d) => checkedIds.has(d.id));
  // El preview del alta corre sobre las deducciones vivas; el de la edición, sobre el snapshot.
  const preview = previewNet(grossNumber, isEdit ? (editing?.deductions ?? []) : chosen);
  const shownNet =
    overrideEnabled && netOverride !== '' ? parseAmountInput(netOverride) : preview.calculatedNet;

  const toggle = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const chosenOverride =
      overrideEnabled && netOverride !== '' ? parseAmountInput(netOverride) : undefined;

    if (isEdit && editing) {
      // El bloque de plata viaja SIEMPRE completo (bruto + override o su ausencia): así el
      // server sabe que sacar el override es intencional y no un campo que no vino.
      updateMutation.mutate(
        {
          id: editing.id,
          grossAmount: grossNumber,
          netOverride: chosenOverride,
          accountId,
          date,
          notes,
          concept,
        },
        {
          onSuccess: (data) => {
            toast.success(
              `Ingreso actualizado. Nuevo balance: ${formatMoney(data.accountBalance, data.currency)}`,
            );
            onClose?.();
          },
          onError: (error) => toast.error(incomeErrorMessage(error)),
        },
      );
      return;
    }

    createMutation.mutate(
      {
        incomeSourceId,
        accountId,
        grossAmount: grossNumber,
        deductionIds: chosen.map((d) => d.id),
        netOverride: chosenOverride,
        date,
        notes: notes || undefined,
        concept: concept || undefined,
      },
      {
        onSuccess: (data) => {
          // Sprint 22: accountBalance es el sub-balance de la moneda de la TX (= la de la
          // source), no la de la cuenta — un sueldo USD a una cuenta ARS mostraría "ARS" mal.
          toast.success(`Ingreso registrado. Nuevo balance: ${formatMoney(data.accountBalance, data.currency)}`);
          onClose?.();
        },
        onError: (error) => toast.error(incomeErrorMessage(error)),
      },
    );
  };

  const currency = isEdit
    ? (editing?.currency ?? '')
    : (accounts?.find((a) => a.id === accountId)?.currency ?? '');

  return (
    <Card>
      <h2>{isEdit ? 'Editar ingreso' : 'Registrar ingreso'}</h2>

      {!isEdit && activeSources.length === 0 ? (
        <p className="text-body">Creá una fuente de ingreso activa para registrar ingresos.</p>
      ) : (
        <form
          onSubmit={handleSubmit}
          aria-label={isEdit ? 'Editar ingreso' : 'Registrar ingreso'}
          className="flex flex-col gap-3"
        >
          {isEdit ? (
            // La fuente no se cambia: la entry pertenece a la suya (sus deducciones, su moneda).
            <p className="text-sm text-body">
              Fuente: <span className="text-ink">{editing?.sourceName}</span>
            </p>
          ) : (
            <Select
              label="Fuente"
              id="entry-source"
              value={incomeSourceId}
              onChange={(e) => setIncomeSourceId(e.target.value)}
              required
              disabled={busy}
            >
              <option value="">Elegí una fuente</option>
              {activeSources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name} ({source.currency})
                </option>
              ))}
            </Select>
          )}

          <Select
            label="Cuenta destino"
            id="entry-account"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            required
            disabled={busy}
          >
            <option value="">Elegí una cuenta</option>
            {accounts?.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.currency})
              </option>
            ))}
          </Select>

          <MoneyInput
            label="Monto bruto"
            id="entry-gross"
            value={grossAmount}
            onValueChange={setGrossAmount}
            required
            disabled={busy}
          />

          {!isEdit && activeDeductions.length > 0 && (
            <fieldset className="flex flex-col gap-1 rounded-sm border border-line p-3">
              <legend className="px-1 text-sm text-ink">Deducciones</legend>
              {activeDeductions.map((d) => {
                const line = preview.lines.find((l) => l.name === d.name);
                return (
                  <label key={d.id} className="flex items-center justify-between gap-2 py-1 text-sm">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checkedIds.has(d.id)}
                        onChange={() => toggle(d.id)}
                        disabled={busy}
                        className="h-5 w-5 rounded-sm border border-line accent-brand"
                      />
                      {d.name} ({d.type === 'PERCENTAGE' ? `${d.value}%` : formatMoney(d.value, currency)})
                    </span>
                    {checkedIds.has(d.id) && line && (
                      <span className="tabular-nums text-expense">
                        −{formatMoney(line.appliedAmount, currency)}
                      </span>
                    )}
                  </label>
                );
              })}
            </fieldset>
          )}

          {isEdit && (editing?.deductions.length ?? 0) > 0 && (
            <p className="text-sm text-body">
              {editing?.deductions.length} deducciones de este cobro: se recalculan solas sobre el
              bruto nuevo.
            </p>
          )}

          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={overrideEnabled}
              onChange={(e) => setOverrideEnabled(e.target.checked)}
              disabled={busy}
              className="h-5 w-5 rounded-sm border border-line accent-brand"
            />
            Pisar el neto manualmente
          </label>
          {overrideEnabled && (
            <MoneyInput
              label="Neto manual"
              id="entry-net-override"
              value={netOverride}
              onValueChange={setNetOverride}
              disabled={busy}
            />
          )}

          {grossNumber > 0 && (
            <p className="text-sm text-body">
              Neto a acreditar: <Amount amount={shownNet} currency={currency} tone="income" size="sm" />
              {overrideEnabled && ' (manual)'}
            </p>
          )}

          <DateField
            label="Fecha"
            id="entry-date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            disabled={busy}
          />

          <Input
            label="Descripción"
            id="entry-notes"
            type="text"
            maxLength={500}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={busy}
          />

          <ConceptInput value={concept} onChange={setConcept} disabled={busy} />

          {/* Guardar (izq) · Cancelar (centro) · Borrar (der, rojizo) — convención de la casa,
              misma que AccountForm. FR-9: el Borrar vive DENTRO del form de edición. */}
          <div className="flex gap-3">
            <Button type="submit" loading={busy}>
              Guardar
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onClose?.()}
              disabled={busy}
              className={isEdit && onDelete ? 'mx-auto' : undefined}
            >
              Cancelar
            </Button>
            {isEdit && editing && onDelete && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => onDelete(editing)}
                disabled={busy}
                className="border-expense/40 text-expense hover:bg-expense/10 hover:text-expense"
              >
                Borrar
              </Button>
            )}
          </div>
        </form>
      )}
    </Card>
  );
}
