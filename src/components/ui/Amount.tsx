import { formatMoney } from '../../lib/money';

export type AmountTone = 'auto' | 'income' | 'expense' | 'neutral';
export type AmountSize = 'sm' | 'md' | 'lg' | 'xl';

type AmountProps = {
  amount: number;
  currency: string;
  tone?: AmountTone;
  size?: AmountSize;
  className?: string;
};

const TONE_CLASS: Record<'income' | 'expense' | 'neutral', string> = {
  income: 'text-income',
  expense: 'text-expense',
  neutral: 'text-ink',
};

// leading-[1.1] es un valor arbitrary explícitamente mandatado por design-principles.md
// §2 ("montos 1.1"), no un px suelto ad-hoc — única excepción a la regla anti-arbitrary.
const SIZE_CLASS: Record<AmountSize, string> = {
  sm: 'text-sm leading-[1.1]',
  md: 'text-base leading-[1.1]',
  lg: 'text-xl leading-[1.1]',
  xl: 'text-2xl leading-[1.1]',
};

// El componente más usado del sistema: monto + signo explícito + color semántico.
// El color NUNCA es la única señal (§1.6) — el signo +/− siempre acompaña.
//
// El signo SIEMPRE respeta el `tone` resuelto, nunca el signo crudo de `amount` a secas:
// con tone explícito ("income"/"expense") el signo se fuerza a juego con el tono, para que
// nunca queden en desacuerdo (ej. `tone="expense"` nunca puede mostrar "+" en rojo).
export function Amount({ amount, currency, tone = 'auto', size = 'md', className }: AmountProps) {
  const resolvedTone: 'income' | 'expense' | 'neutral' =
    tone === 'auto' ? (amount >= 0 ? 'income' : 'expense') : tone;

  let sign: string;
  let formatted: string;
  if (tone === 'neutral') {
    // Sin signo ni color forzados: se muestra el monto tal cual lo formatea `formatMoney`.
    sign = '';
    formatted = formatMoney(amount, currency);
  } else if (tone === 'income') {
    sign = '+';
    formatted = formatMoney(Math.abs(amount), currency);
  } else if (tone === 'expense') {
    sign = '−';
    formatted = formatMoney(Math.abs(amount), currency);
  } else {
    // tone="auto": el signo (y el tono resuelto arriba) salen del signo propio de `amount`.
    sign = amount === 0 ? '' : amount > 0 ? '+' : '−';
    formatted = formatMoney(Math.abs(amount), currency);
  }

  return (
    <span
      className={[
        'font-semibold tabular-nums',
        SIZE_CLASS[size],
        TONE_CLASS[resolvedTone],
        className ?? '',
      ]
        .join(' ')
        .trim()}
    >
      {sign}
      {formatted}
    </span>
  );
}
