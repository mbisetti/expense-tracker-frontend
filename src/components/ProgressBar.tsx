type ProgressBarProps = {
  ratio: number;
  tone: 'brand' | 'warning' | 'expense' | 'income';
  label: string;
};

const TONE_CLASSES: Record<ProgressBarProps['tone'], string> = {
  brand: 'bg-[var(--accent)]',
  warning: 'bg-[var(--warning)]',
  expense: 'bg-[var(--expense)]',
  income: 'bg-[var(--income)]',
};

export function ProgressBar({ ratio, tone, label }: ProgressBarProps) {
  const clamped = Math.min(Math.max(ratio, 0), 1);

  return (
    <div
      role="progressbar"
      aria-label={label}
      // valuenow clampeado: ARIA exige min <= now <= max; el % real (ej. 120%) va en valuetext
      aria-valuenow={Math.round(clamped * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={`${Math.round(ratio * 100)}%`}
      className="h-2 w-full rounded-full bg-[var(--border)] overflow-hidden"
    >
      <div
        className={`h-full rounded-full ${TONE_CLASSES[tone]}`}
        style={{ width: `${clamped * 100}%` }}
      />
    </div>
  );
}
