import { Select } from '../../components/ui/Select';
import { StepIntro } from './StepIntro';

// S46 (D6): las mismas tres de Ajustes, con ARS primera. El alta del back todavía deja a todo
// el mundo en USD (Google lo hardcodea, el register por email no manda nada) y este paso es el
// que lo corrige, a los diez segundos de existir la cuenta.
const CURRENCIES: { code: string; label: string }[] = [
  { code: 'ARS', label: 'Peso argentino (ARS)' },
  { code: 'USD', label: 'Dólar (USD)' },
  { code: 'EUR', label: 'Euro (EUR)' },
];

type StepWelcomeProps = {
  currency: string;
  onCurrencyChange: (currency: string) => void;
  disabled?: boolean;
};

export function StepWelcome({ currency, onCurrencyChange, disabled }: StepWelcomeProps) {
  return (
    <div className="flex flex-col gap-4">
      <StepIntro
        title="Bienvenido a Maat"
        lines={[
          'Maat lleva tus cuentas: vos anotás lo que pasa y los saldos los calcula la app.',
          'Son cinco pasos cortos y cargás tus datos de verdad, así que al terminar no hay nada que borrar.',
        ]}
      />

      <Select
        label="Moneda principal"
        id="onboarding-currency"
        value={currency}
        disabled={disabled}
        onChange={(e) => onCurrencyChange(e.target.value)}
        helper="Se usa para el total consolidado y para estimar equivalencias. Podés cambiarla después en Ajustes."
      >
        {CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.label}
          </option>
        ))}
      </Select>

      <p className="text-sm text-muted">
        Las categorías ya están listas: creamos las 19 de siempre con tu cuenta. Si querés
        cambiarlas, viven en Datos, Categorías.
      </p>
    </div>
  );
}
