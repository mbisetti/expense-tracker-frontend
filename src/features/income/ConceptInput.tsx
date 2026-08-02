import { Input } from '../../components/ui/Input';

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
};

/**
 * S36 (D5/FR-4) — el concepto del cobro. Los extras (aguinaldo, bono) NO se modelan como
 * expectativa: ya se podían cargar a mano y lo único que faltaba era poder distinguirlos después
 * de un sueldo raro. Un campo, el mismo copy en el alta, en el confirm y en la edición.
 */
export function ConceptInput({ value, onChange, disabled, id = 'entry-concept' }: Props) {
  return (
    <Input
      label="Concepto (opcional)"
      id={id}
      type="text"
      maxLength={100}
      placeholder="Aguinaldo 1/2, bono, etc."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    />
  );
}
