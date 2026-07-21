import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { Switch } from '../../components/ui/Switch';
import type { RecurringFrequency, Weekday } from './api';
import type { RecurringConfig } from './recurringConfig';

const WEEKDAYS: { value: Weekday; label: string }[] = [
  { value: 'MONDAY', label: 'Lunes' },
  { value: 'TUESDAY', label: 'Martes' },
  { value: 'WEDNESDAY', label: 'Miércoles' },
  { value: 'THURSDAY', label: 'Jueves' },
  { value: 'FRIDAY', label: 'Viernes' },
  { value: 'SATURDAY', label: 'Sábado' },
  { value: 'SUNDAY', label: 'Domingo' },
];

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

type Props = {
  value: RecurringConfig;
  onChange: (patch: Partial<RecurringConfig>) => void;
  idPrefix: string;
  disabled?: boolean;
};

export function RecurringConfigFields({ value, onChange, idPrefix, disabled }: Props) {
  const showInstallments = value.frequency === 'MONTHLY';

  return (
    <>
      <Select
        label="Frecuencia"
        id={`${idPrefix}-frequency`}
        value={value.frequency}
        onChange={(e) => onChange({ frequency: e.target.value as RecurringFrequency })}
        disabled={disabled}
      >
        <option value="MONTHLY">Mensual</option>
        <option value="BIWEEKLY">Quincenal</option>
        <option value="WEEKLY">Semanal</option>
        <option value="ANNUAL">Anual</option>
      </Select>

      {value.frequency === 'MONTHLY' && (
        <Input
          label="Día de cobro (1-31)"
          id={`${idPrefix}-billing-day`}
          type="number"
          min={1}
          max={31}
          value={value.billingDay}
          onChange={(e) => onChange({ billingDay: e.target.value })}
          helper="Si el mes no tiene ese día, cae en el último."
          disabled={disabled}
        />
      )}

      {value.frequency === 'BIWEEKLY' && (
        <Input
          label="Día base (1-15)"
          id={`${idPrefix}-billing-day`}
          type="number"
          min={1}
          max={15}
          value={value.billingDay}
          onChange={(e) => onChange({ billingDay: e.target.value })}
          helper="Se cobra ese día y 15 días después."
          disabled={disabled}
        />
      )}

      {value.frequency === 'WEEKLY' && (
        <Select
          label="Día de la semana"
          id={`${idPrefix}-weekday`}
          value={value.weekday}
          onChange={(e) => onChange({ weekday: e.target.value as Weekday })}
          disabled={disabled}
        >
          <option value="">Elegí un día</option>
          {WEEKDAYS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </Select>
      )}

      {value.frequency === 'ANNUAL' && (
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Mes"
            id={`${idPrefix}-due-month`}
            value={value.dueMonth}
            onChange={(e) => onChange({ dueMonth: e.target.value })}
            disabled={disabled}
          >
            <option value="">Elegí un mes</option>
            {MONTHS.map((m, i) => (
              <option key={m} value={String(i + 1)}>
                {m}
              </option>
            ))}
          </Select>
          <Input
            label="Día (1-31)"
            id={`${idPrefix}-billing-day`}
            type="number"
            min={1}
            max={31}
            value={value.billingDay}
            onChange={(e) => onChange({ billingDay: e.target.value })}
            disabled={disabled}
          />
        </div>
      )}

      {showInstallments && (
        <div className="flex flex-col gap-3 rounded-md border border-line bg-surface p-3">
          <Switch
            id={`${idPrefix}-installments`}
            label="En cuotas"
            checked={value.inInstallments}
            onChange={(v) => onChange({ inInstallments: v })}
            disabled={disabled}
          />
          {value.inInstallments && (
            <>
              <Input
                label="Cantidad de cuotas"
                id={`${idPrefix}-installments-total`}
                type="number"
                min={2}
                value={value.installmentsTotal}
                onChange={(e) => onChange({ installmentsTotal: e.target.value })}
                disabled={disabled}
              />
              <MoneyInput
                label="Precio de contado (opcional)"
                id={`${idPrefix}-cash-price`}
                value={value.cashPrice}
                onValueChange={(v) => onChange({ cashPrice: v })}
                helper="Mostramos cuánto te cuesta financiar."
                disabled={disabled}
              />
            </>
          )}
        </div>
      )}
    </>
  );
}
