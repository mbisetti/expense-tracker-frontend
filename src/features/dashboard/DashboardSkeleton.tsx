function CardPlaceholder() {
  return (
    <div className="rounded-xl border border-line bg-surface p-4 animate-pulse">
      <div className="h-3 w-20 rounded bg-line mb-3" />
      <div className="h-6 w-28 rounded bg-line" />
    </div>
  );
}

function ChartPlaceholder() {
  return (
    <div className="rounded-xl border border-line bg-surface p-4 animate-pulse">
      <div className="h-5 w-40 rounded bg-line mb-4" />
      <div className="h-[240px] rounded bg-line" />
    </div>
  );
}

export function OverviewSkeleton() {
  return (
    <div role="status" aria-label="Cargando resumen">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CardPlaceholder />
        <CardPlaceholder />
        <CardPlaceholder />
        <CardPlaceholder />
      </div>
      <ChartPlaceholder />
      <span className="sr-only">Cargando resumen...</span>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div role="status" aria-label="Cargando gráfico">
      <ChartPlaceholder />
    </div>
  );
}

export function ListSkeleton() {
  return (
    <div
      role="status"
      aria-label="Cargando movimientos"
      className="rounded-xl border border-line bg-surface p-4 animate-pulse"
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex justify-between py-2">
          <div className="h-4 w-32 bg-line rounded" />
          <div className="h-4 w-20 bg-line rounded" />
        </div>
      ))}
    </div>
  );
}
