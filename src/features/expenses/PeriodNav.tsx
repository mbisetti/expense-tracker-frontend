import { ChevronLeftIcon, ChevronRightIcon } from '../../components/ui/icons';

type PeriodNavProps = {
  year: number;
  /** 1-12 */
  month: number;
  onPrev: () => void;
  onNext: () => void;
  /** false en el mes corriente → flecha adelante deshabilitada. */
  canGoNext: boolean;
};

// Sprint 24 (D5): navegación mensual ← {Mes Año} →. es-AR con la primera en mayúscula.
function periodLabel(year: number, month: number): string {
  const formatted = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(
    new Date(year, month - 1, 1),
  );
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

const ARROW_CLASS =
  'flex h-10 w-10 items-center justify-center rounded-full border border-line text-body transition-colors hover:border-brand hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-body';

export function PeriodNav({ year, month, onPrev, onNext, canGoNext }: PeriodNavProps) {
  return (
    <div className="flex items-center gap-3">
      <button type="button" aria-label="Mes anterior" onClick={onPrev} className={ARROW_CLASS}>
        <ChevronLeftIcon className="h-5 w-5" />
      </button>
      <span className="min-w-44 text-center text-base font-medium text-ink">
        {periodLabel(year, month)}
      </span>
      <button
        type="button"
        aria-label="Mes siguiente"
        onClick={onNext}
        disabled={!canGoNext}
        className={ARROW_CLASS}
      >
        <ChevronRightIcon className="h-5 w-5" />
      </button>
    </div>
  );
}
