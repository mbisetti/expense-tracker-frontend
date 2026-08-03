import { useState, type FormEvent } from 'react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/toastContext';
import { useIncomeSources } from './useIncomeSources';
import { useCreateIncomeSource } from './useIncomeMutations';
import { incomeErrorMessage } from './errorMessages';
import { DeductionManager } from './DeductionManager';
import { parseAmountInput } from '../../lib/money';
import { needsDueMonth } from './api';
import type { IncomeFrequency } from './api';

const FREQUENCY_OPTIONS: { value: IncomeFrequency; label: string }[] = [
  { value: 'MONTHLY', label: 'Mensual' },
  { value: 'BIWEEKLY', label: 'Quincenal' },
  { value: 'WEEKLY', label: 'Semanal' },
  // S36 (D7). No sirven para el aguinaldo colgado del sueldo (una fuente tiene UNA frecuencia):
  // son para fuentes genuinamente anuales, como dividendos o un bono de otra empresa.
  { value: 'SEMIANNUAL', label: 'Semestral' },
  { value: 'ANNUAL', label: 'Anual' },
];

// S36 (EC-4): sin mes ancla, una fuente anual mostraría expectativa los doce meses.
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const label = new Date(2026, i, 1).toLocaleDateString('es-AR', { month: 'long' });
  return { value: i + 1, label: label.charAt(0).toUpperCase() + label.slice(1) };
});

export function IncomeSourceList() {
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('');
  const [isRecurrent, setIsRecurrent] = useState(false);
  const [frequency, setFrequency] = useState<IncomeFrequency>('MONTHLY');
  const [expectedAmount, setExpectedAmount] = useState('');
  const [billingDay, setBillingDay] = useState('');
  const [dueMonth, setDueMonth] = useState('1');
  const [expandedSourceId, setExpandedSourceId] = useState<string | null>(null);

  const toast = useToast();
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
    setDueMonth('1');
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
              expectedAmount: parseAmountInput(expectedAmount),
              billingDay: Number(billingDay),
              // Sólo viaja donde significa algo: el server lo guarda NULL en las demás.
              ...(needsDueMonth(frequency) ? { dueMonth: Number(dueMonth) } : {}),
            }
          : {}),
      },
      {
        onSuccess: () => {
          toast.success('Fuente de ingreso creada.');
          closeForm();
        },
        onError: (error) => toast.error(incomeErrorMessage(error)),
      },
    );
  };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2>Fuentes de ingreso</h2>
        {!formOpen && (
          <Button type="button" size="sm" onClick={() => setFormOpen(true)}>
            Nueva fuente
          </Button>
        )}
      </div>

      {formOpen && (
        <form onSubmit={handleSubmit} aria-label="Nueva fuente" className="mt-3 flex flex-col gap-3">
          <Input
            label="Nombre"
            id="source-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={createMutation.isPending}
          />

          <Input
            label="Moneda"
            id="source-currency"
            type="text"
            className="uppercase"
            maxLength={3}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            required
            disabled={createMutation.isPending}
          />

          <label htmlFor="source-recurrent" className="flex items-center gap-2 text-sm text-ink">
            <input
              id="source-recurrent"
              type="checkbox"
              checked={isRecurrent}
              onChange={(e) => setIsRecurrent(e.target.checked)}
              disabled={createMutation.isPending}
              className="h-5 w-5 rounded-sm border border-line accent-brand"
            />
            ¿Es un ingreso recurrente?
          </label>

          {isRecurrent && (
            <>
              <Select
                label="Frecuencia"
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
              </Select>

              <MoneyInput
                label="Monto esperado"
                id="source-expected-amount"
                value={expectedAmount}
                onValueChange={setExpectedAmount}
                required
                disabled={createMutation.isPending}
              />

              <Input
                label="Día de cobro (1-28)"
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

              {needsDueMonth(frequency) && (
                <Select
                  label={frequency === 'SEMIANNUAL' ? 'Primer mes de cobro' : 'Mes de cobro'}
                  id="source-due-month"
                  value={dueMonth}
                  onChange={(e) => setDueMonth(e.target.value)}
                  disabled={createMutation.isPending}
                >
                  {MONTH_OPTIONS.map((option) => (
                    <option key={option.value} value={String(option.value)}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              )}
            </>
          )}

          <div className="flex gap-3">
            <Button type="submit" loading={createMutation.isPending}>
              Guardar
            </Button>
            <Button type="button" variant="secondary" onClick={closeForm} disabled={createMutation.isPending}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      <div className="mt-3">
        {isPending && <Skeleton variant="list" rows={2} />}

        {isError && (
          <p role="alert" className="text-expense">
            No pudimos cargar las fuentes. Intentá de nuevo.
          </p>
        )}

        {sources && sources.length === 0 && (
          <EmptyState
            title="Todavía no tenés fuentes de ingreso."
            message="Creá una para registrar ingresos."
          />
        )}

        {sources && sources.length > 0 && (
          <ul className="list-none p-0 m-0 divide-y divide-line">
            {sources.map((source) => (
              <li key={source.id} className="py-2">
                <div className="flex items-center justify-between">
                  <span className={source.active ? 'text-ink' : 'text-ink opacity-60'}>
                    {source.name}
                    {!source.active && <span className="text-sm text-body"> (inactiva)</span>}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-sm text-body">{source.currency}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-expanded={expandedSourceId === source.id}
                      onClick={() =>
                        setExpandedSourceId(expandedSourceId === source.id ? null : source.id)
                      }
                    >
                      {expandedSourceId === source.id ? 'Ocultar' : 'Deducciones'}
                    </Button>
                  </span>
                </div>
                {expandedSourceId === source.id && <DeductionManager sourceId={source.id} />}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
