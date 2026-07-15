export type ProgressBarTone = 'brand' | 'warning' | 'expense' | 'income';

type ProgressBarProps = {
  ratio: number;
  tone: ProgressBarTone;
  label: string;
  /** Posición (0..1) de una marca vertical decorativa sobre la barra, ej. proyección fin de mes */
  markerRatio?: number;
  className?: string;
};

const TONE_CLASSES: Record<ProgressBarTone, string> = {
  brand: 'bg-brand',
  warning: 'bg-warning',
  expense: 'bg-expense',
  income: 'bg-income',
};

// ProgressBar del design system (Bloque 3) — supersede a components/ProgressBar.tsx (que
// queda tal cual para no tocar pantallas existentes; se migra en S19). Misma API, tokenizada.
export function ProgressBar({ ratio, tone, label, markerRatio, className }: ProgressBarProps) {
  const clamped = Math.min(Math.max(ratio, 0), 1);
  const clampedMarker =
    markerRatio === undefined ? undefined : Math.min(Math.max(markerRatio, 0), 1);

  return (
    <div
      role="progressbar"
      aria-label={label}
      // valuenow clampeado: ARIA exige min <= now <= max; el % real (ej. 120%) va en valuetext
      aria-valuenow={Math.round(clamped * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={`${Math.round(ratio * 100)}%`}
      className={[
        'relative h-2 w-full overflow-hidden rounded-full bg-line',
        className ?? '',
      ]
        .join(' ')
        .trim()}
    >
      <div
        className={`h-full rounded-full ${TONE_CLASSES[tone]}`}
        style={{ width: `${clamped * 100}%` }}
      />
      {clampedMarker !== undefined && (
        <div
          aria-hidden="true"
          className="absolute top-0 h-full w-0.5 bg-ink"
          style={{ left: `${clampedMarker * 100}%` }}
        />
      )}
    </div>
  );
}
