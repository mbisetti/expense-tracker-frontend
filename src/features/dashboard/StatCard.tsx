import { Card } from '../../components/ui/Card';
import { Amount, type AmountTone } from '../../components/ui/Amount';

export type StatCardTone = 'neutral' | 'income' | 'expense';

type StatCardProps = {
  label: string;
  amount: number;
  currency: string;
  tone: StatCardTone;
  /** Línea secundaria muted opcional, ej. desglose formal/informal */
  secondary?: string;
};

const AMOUNT_TONE: Record<StatCardTone, AmountTone> = {
  neutral: 'neutral',
  income: 'income',
  expense: 'expense',
};

export function StatCard({ label, amount, currency, tone, secondary }: StatCardProps) {
  return (
    <Card className="flex flex-col gap-1">
      <p className="text-xs uppercase tracking-wide text-body">{label}</p>
      <Amount amount={amount} currency={currency} tone={AMOUNT_TONE[tone]} size="lg" />
      {secondary && <p className="text-sm text-body">{secondary}</p>}
    </Card>
  );
}
