export type SkeletonVariant = 'text' | 'card' | 'list' | 'chart';

type SkeletonProps = {
  variant: SkeletonVariant;
  /** Sólo aplica a variant="list": cantidad de filas placeholder. */
  rows?: number;
  className?: string;
};

// bg-surface-sunken (mismo well que inputs) + animate-pulse: el estándar de loading del
// sistema (§5 design-principles.md) — nunca un spinner a pantalla completa.
const BLOCK = 'animate-pulse rounded-sm bg-surface-sunken motion-reduce:animate-none';

export function Skeleton({ variant, rows = 3, className }: SkeletonProps) {
  return (
    <div role="status" aria-label="Cargando…" className={className}>
      {variant === 'text' && <div className={`${BLOCK} h-4 w-full`} />}

      {variant === 'card' && <div className={`${BLOCK} h-32 w-full rounded-md`} />}

      {variant === 'list' && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: rows }, (_, index) => (
            <div key={index} className={`${BLOCK} h-14 w-full rounded-md`} />
          ))}
        </div>
      )}

      {variant === 'chart' && <div className={`${BLOCK} h-56 w-full rounded-md`} />}
    </div>
  );
}
