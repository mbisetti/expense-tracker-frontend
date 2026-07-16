import type { ChangeEvent } from 'react';
import { Input } from './Input';
import { formatAmountDisplay } from '../../lib/money';

type MoneyInputProps = {
  label: string;
  id: string;
  /** Display string (estado del padre), ej. "150.000,50". Parsealo con parseAmountInput. */
  value: string;
  onValueChange: (display: string) => void;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helper?: string;
  placeholder?: string;
  className?: string;
};

// Campo de monto del design system: reusa Input pero fuerza entrada numérica es-AR con
// separador de miles en vivo y SIN las flechitas de spinner (type=text + inputMode=decimal,
// no type=number). Bloquea letras/símbolos vía formatAmountDisplay. Resuelve los reclamos de
// "flechitas", "que autocomplete puntos" y "me deja poner letras y simbolos" de una.
export function MoneyInput({ value, onValueChange, ...rest }: MoneyInputProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onValueChange(formatAmountDisplay(e.target.value));
  };

  return (
    <Input
      {...rest}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={value}
      onChange={handleChange}
    />
  );
}
