import { useState } from 'react';
import { Select } from './Select';
import { Input } from './Input';

const OTHER = '__other__';

type CurrencySelectProps = {
  id: string;
  label: string;
  /** Monedas conocidas de la cuenta (la principal primera). */
  options: string[];
  value: string;
  onChange: (currency: string) => void;
  disabled?: boolean;
};

// Selector de moneda discreto (Sprint 22 D4): preseleccionado con la principal de la cuenta,
// un toque para cambiarla, y "Otra…" para la primera tx en una moneda nueva (input de 3 letras,
// uppercase). Para resetear al cambiar de cuenta, montá el componente con `key={accountId}`.
export function CurrencySelect({ id, label, options, value, onChange, disabled }: CurrencySelectProps) {
  const [isOther, setIsOther] = useState(value !== '' && !options.includes(value));

  return (
    <div className="flex flex-col gap-2">
      <Select
        label={label}
        id={id}
        value={isOther ? OTHER : value}
        disabled={disabled}
        onChange={(e) => {
          const v = e.target.value;
          if (v === OTHER) {
            setIsOther(true);
            onChange('');
          } else {
            setIsOther(false);
            onChange(v);
          }
        }}
      >
        {options.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
        <option value={OTHER}>Otra…</option>
      </Select>

      {isOther && (
        <Input
          label="Moneda (3 letras)"
          id={`${id}-other`}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3))}
          maxLength={3}
          placeholder="EUR"
          disabled={disabled}
        />
      )}
    </div>
  );
}
