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
export function Amount({ amount, currency, tone = 'auto', size = 'md', className }: AmountProps) {
  const resolvedTone: 'income' | 'expense' | 'neutral' =
    tone === 'auto' ? (amount >= 0 ? 'income' : 'expense') : tone;

  const sign = amount === 0 ? '' : amount > 0 ? '+' : '−';
  const formatted = formatMoney(Math.abs(amount), currency);

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
