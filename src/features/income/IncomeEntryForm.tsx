import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Card } from '../../components/Card';
import { formatMoney } from '../../lib/money';
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
  useEffect(() => {
    setCheckedIds(new Set(activeDeductions.map((d) => d.id)));
  }, [activeDeductions]);

  const selectedAccount = accounts?.find((a) => a.id === accountId);
  const grossNumber = Number(grossAmount) || 0;
  const chosen = activeDeductions.filter((d) => checkedIds.has(d.id));
  const preview = previewNet(grossNumber, chosen);
  const shownNet = overrideEnabled && netOverride !== '' ? Number(netOverride) : preview.calculatedNet;

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
    mutation.mutate(
      {
        incomeSourceId,
        accountId,
        grossAmount: grossNumber,
        deductionIds: chosen.map((d) => d.id),
        netOverride: overrideEnabled && netOverride !== '' ? Number(netOverride) : undefined,
        date,
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          setGrossAmount('');
          setNotes('');
          setOverrideEnabled(false);
          setNetOverride('');
        },
      },
    );
  };

  const currency = accounts?.find((a) => a.id === accountId)?.currency ?? '';

  return (
    <Card>
      <h2>Registrar ingreso</h2>

      {activeSources.length === 0 ? (
        <p>Creá una fuente de ingreso activa para registrar ingresos.</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <label htmlFor="entry-source">Fuente</label>
          <select
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
          </select>

          <label htmlFor="entry-account">Cuenta destino</label>
          <select
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
          </select>

          <label htmlFor="entry-gross">Monto bruto</label>
          <input
            id="entry-gross"
            type="number"
            min="0.01"
            step="0.01"
            value={grossAmount}
            onChange={(e) => setGrossAmount(e.target.value)}
            required
            disabled={mutation.isPending}
          />

          {activeDeductions.length > 0 && (
            <fieldset className="border border-line rounded p-2 my-2">
              <legend className="text-sm">Deducciones</legend>
              {activeDeductions.map((d) => {
                const line = preview.lines.find((l) => l.name === d.name);
                return (
                  <label key={d.id} className="flex justify-between items-center gap-2 text-sm py-1">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checkedIds.has(d.id)}
                        onChange={() => toggle(d.id)}
                        disabled={mutation.isPending}
                      />
                      {d.name} ({d.type === 'PERCENTAGE' ? `${d.value}%` : formatMoney(d.value, currency)})
                    </span>
                    {checkedIds.has(d.id) && line && (
                      <span className="text-expense tabular-nums">
                        −{formatMoney(line.appliedAmount, currency)}
                      </span>
                    )}
                  </label>
                );
              })}
            </fieldset>
          )}

          <label className="flex items-center gap-2 text-sm my-1">
            <input
              type="checkbox"
              checked={overrideEnabled}
              onChange={(e) => setOverrideEnabled(e.target.checked)}
              disabled={mutation.isPending}
            />
            Pisar el neto manualmente
          </label>
          {overrideEnabled && (
            <>
              <label htmlFor="entry-net-override">Neto manual</label>
              <input
                id="entry-net-override"
                type="number"
                min="0.01"
                step="0.01"
                value={netOverride}
                onChange={(e) => setNetOverride(e.target.value)}
                disabled={mutation.isPending}
              />
            </>
          )}

          {grossNumber > 0 && (
            <p className="text-body text-sm my-1">
              Neto a acreditar:{' '}
              <span className="text-income tabular-nums">{formatMoney(shownNet, currency)}</span>
              {overrideEnabled && ' (manual)'}
            </p>
          )}

          <label htmlFor="entry-date">Fecha</label>
          <input
            id="entry-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            disabled={mutation.isPending}
          />

          <label htmlFor="entry-notes">Descripción (opcional)</label>
          <input
            id="entry-notes"
            type="text"
            maxLength={500}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={mutation.isPending}
          />

          {mutation.isError && <p role="alert">{incomeErrorMessage(mutation.error)}</p>}

          {mutation.isSuccess && selectedAccount && (
            <p className="text-income">
              Ingreso registrado. Nuevo balance:{' '}
              {formatMoney(mutation.data.accountBalance, selectedAccount.currency)}
            </p>
          )}

          <button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Guardando...' : 'Guardar'}
          </button>
        </form>
      )}
    </Card>
  );
}
