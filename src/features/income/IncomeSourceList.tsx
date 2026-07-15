import { useState, type FormEvent } from 'react';
import { Card } from '../../components/Card';
import { PlaceholderRow } from '../../components/SectionPlaceholder';
import { useIncomeSources } from './useIncomeSources';
import { useCreateIncomeSource } from './useIncomeMutations';
import { incomeErrorMessage } from './errorMessages';
import { DeductionManager } from './DeductionManager';
import type { IncomeFrequency } from './api';

const FREQUENCY_OPTIONS: { value: IncomeFrequency; label: string }[] = [
  { value: 'MONTHLY', label: 'Mensual' },
  { value: 'BIWEEKLY', label: 'Quincenal' },
  { value: 'WEEKLY', label: 'Semanal' },
];

export function IncomeSourceList() {
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('');
  const [isRecurrent, setIsRecurrent] = useState(false);
  const [frequency, setFrequency] = useState<IncomeFrequency>('MONTHLY');
  const [expectedAmount, setExpectedAmount] = useState('');
  const [billingDay, setBillingDay] = useState('');
  const [expandedSourceId, setExpandedSourceId] = useState<string | null>(null);

  const { data: sources, isPending, isError } = useIncomeSources();
  const createMutation = useCreateIncomeSource();

  const closeForm = () => {
    setFormOpen(false);
    setName('');
    setCurrency('');
    setIsRecurrent(false);
    setFrequency('MONTHLY');
    setExpectedAmount('');
    setBillingDay('');
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    createMutation.mutate(
      {
        name,
        currency,
        ...(isRecurrent
          ? {
              frequency,
              expectedAmount: Number(expectedAmount),
              billingDay: Number(billingDay),
            }
          : {}),
      },
      { onSuccess: closeForm },
    );
  };

  return (
    <Card>
      <div className="flex justify-between items-center">
        <h2>Fuentes de ingreso</h2>
        {!formOpen && (
          <button type="button" onClick={() => setFormOpen(true)}>
            Nueva fuente
          </button>
        )}
      </div>

      {formOpen && (
        <form onSubmit={handleSubmit} aria-label="Nueva fuente">
          <label htmlFor="source-name">Nombre</label>
          <input
            id="source-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={createMutation.isPending}
          />

          <label htmlFor="source-currency">Moneda</label>
          <input
            id="source-currency"
            type="text"
            className="uppercase"
            maxLength={3}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            required
            disabled={createMutation.isPending}
          />

          <label htmlFor="source-recurrent">
            <input
              id="source-recurrent"
              type="checkbox"
              checked={isRecurrent}
              onChange={(e) => setIsRecurrent(e.target.checked)}
              disabled={createMutation.isPending}
            />{' '}
            ¿Es un ingreso recurrente?
          </label>

          {isRecurrent && (
            <>
              <label htmlFor="source-frequency">Frecuencia</label>
              <select
                id="source-frequency"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as IncomeFrequency)}
                disabled={createMutation.isPending}
              >
                {FREQUENCY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <label htmlFor="source-expected-amount">Monto esperado</label>
              <input
                id="source-expected-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={expectedAmount}
                onChange={(e) => setExpectedAmount(e.target.value)}
                required
                disabled={createMutation.isPending}
              />

              <label htmlFor="source-billing-day">Día de cobro (1-28)</label>
              <input
                id="source-billing-day"
                type="number"
                min="1"
                max="28"
                step="1"
                value={billingDay}
                onChange={(e) => setBillingDay(e.target.value)}
                required
                disabled={createMutation.isPending}
              />
            </>
          )}

          {createMutation.isError && (
            <p role="alert">{incomeErrorMessage(createMutation.error)}</p>
          )}

          <button type="submit" disabled={createMutation.isPending}>
            Guardar
          </button>
          <button type="button" onClick={closeForm} disabled={createMutation.isPending}>
            Cancelar
          </button>
        </form>
      )}

      {isPending && (
        <div role="status" aria-label="Cargando fuentes" className="flex flex-col gap-3">
          <PlaceholderRow />
          <PlaceholderRow />
        </div>
      )}

      {isError && <p role="alert">No pudimos cargar las fuentes. Intentá de nuevo.</p>}

      {sources && sources.length === 0 && (
        <p>Todavía no tenés fuentes de ingreso. Creá una para registrar ingresos.</p>
      )}

      {sources && sources.length > 0 && (
        <ul className="list-none p-0 m-0 divide-y divide-line">
          {sources.map((source) => (
            <li key={source.id} className="py-2">
              <div className="flex justify-between items-center">
                <span className={`text-ink${!source.active ? ' opacity-60' : ''}`}>
                  {source.name}
                  {!source.active && <span className="text-body text-sm"> (inactiva)</span>}
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-body text-sm">{source.currency}</span>
                  <button
                    type="button"
                    className="text-sm"
                    aria-expanded={expandedSourceId === source.id}
                    onClick={() =>
                      setExpandedSourceId(expandedSourceId === source.id ? null : source.id)
                    }
                  >
                    {expandedSourceId === source.id ? 'Ocultar' : 'Deducciones'}
                  </button>
                </span>
              </div>
              {expandedSourceId === source.id && <DeductionManager sourceId={source.id} />}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
