import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { DateField } from '../../components/ui/DateField';
import { Button } from '../../components/ui/Button';
import { Amount } from '../../components/ui/Amount';
import { useToast } from '../../components/ui/toastContext';
import { formatMoney, parseAmountInput } from '../../lib/money';
import { useAccounts } from '../accounts/useAccounts';
import { useIncomeSources } from './useIncomeSources';
import { useIncomeDeductions } from './useIncomeDeductions';
import { useCreateIncomeEntry } from './useIncomeMutations';
import { previewNet } from './deductionMath';
import { incomeErrorMessage } from './errorMessages';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function IncomeEntryForm() {
  const toast = useToast();
  const { data: sources } = useIncomeSources();
  const { data: accounts } = useAccounts();
  const mutation = useCreateIncomeEntry();

  const activeSources = sources?.filter((source) => source.active) ?? [];

  const [incomeSourceId, setIncomeSourceId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [grossAmount, setGrossAmount] = useState('');
  const [date, setDate] = useState(todayIso());
  const [notes, setNotes] = useState('');
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [overrideEnabled, setOverrideEnabled] = useState(false);
  const [netOverride, setNetOverride] = useState('');

  const { data: deductions } = useIncomeDeductions(incomeSourceId || undefined);
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
  const preview = previewNet(grossNumber, chosen);
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

  const resetForm = () => {
    setIncomeSourceId('');
    setAccountId('');
    setGrossAmount('');
    setDate(todayIso());
    setNotes('');
    setCheckedIds(new Set());
    setOverrideEnabled(false);
    setNetOverride('');
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    mutation.mutate(
      {
        incomeSourceId,
        accountId,
        grossAmount: grossNumber,
        deductionIds: chosen.map((d) => d.id),
        netOverride:
          overrideEnabled && netOverride !== '' ? parseAmountInput(netOverride) : undefined,
        date,
        notes: notes || undefined,
      },
      {
        onSuccess: (data) => {
          // Sprint 22: accountBalance es el sub-balance de la moneda de la TX (= la de la
          // source), no la de la cuenta — un sueldo USD a una cuenta ARS mostraría "ARS" mal.
          toast.success(`Ingreso registrado. Nuevo balance: ${formatMoney(data.accountBalance, data.currency)}`);
          setGrossAmount('');
          setNotes('');
          setOverrideEnabled(false);
          setNetOverride('');
        },
        onError: (error) => toast.error(incomeErrorMessage(error)),
      },
    );
  };

  const currency = accounts?.find((a) => a.id === accountId)?.currency ?? '';

  return (
    <Card>
      <h2>Registrar ingreso</h2>

      {activeSources.length === 0 ? (
        <p className="text-body">Creá una fuente de ingreso activa para registrar ingresos.</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Select
            label="Fuente"
            id="entry-source"
            value={incomeSourceId}
            onChange={(e) => setIncomeSourceId(e.target.value)}
            required
            disabled={mutation.isPending}
          >
            <option value="">Elegí una fuente</option>
            {activeSources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name} ({source.currency})
              </option>
            ))}
          </Select>

          <Select
            label="Cuenta destino"
            id="entry-account"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            required
            disabled={mutation.isPending}
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
            disabled={mutation.isPending}
          />

          {activeDeductions.length > 0 && (
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
                        disabled={mutation.isPending}
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

          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={overrideEnabled}
              onChange={(e) => setOverrideEnabled(e.target.checked)}
              disabled={mutation.isPending}
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
              disabled={mutation.isPending}
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
            disabled={mutation.isPending}
          />

          <Input
            label="Descripción"
            id="entry-notes"
            type="text"
            maxLength={500}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={mutation.isPending}
          />

          <div className="flex gap-3">
            <Button type="submit" loading={mutation.isPending}>
              Guardar
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={resetForm}
              disabled={mutation.isPending}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
