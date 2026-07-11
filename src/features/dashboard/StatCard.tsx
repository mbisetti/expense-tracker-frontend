export type StatCardTone = 'neutral' | 'income' | 'expense';

type StatCardProps = {
  label: string;
  value: string;
  tone: StatCardTone;
};

const TONE_CLASS: Record<StatCardTone, string> = {
  neutral: 'text-ink',
  income: 'text-income',
  expense: 'text-expense',
};

export function StatCard({ label, value, tone }: StatCardProps) {
  return (
    <article className="rounded-xl border border-line bg-surface p-4">
      <p className="text-xs uppercase tracking-wide text-body">{label}</p>
      <p className={`text-xl font-semibold tabular-nums ${TONE_CLASS[tone]}`}>{value}</p>
    </article>
  );
}
