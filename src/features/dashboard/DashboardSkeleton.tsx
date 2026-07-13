import { Card } from '../../components/Card';

function CardPlaceholder() {
  return (
    <Card className="animate-pulse">
      <div className="h-3 w-20 rounded bg-line mb-3" />
      <div className="h-6 w-28 rounded bg-line" />
    </Card>
  );
}

function ChartPlaceholder() {
  return (
    <Card className="animate-pulse">
      <div className="h-5 w-40 rounded bg-line mb-4" />
      <div className="h-[240px] rounded bg-line" />
    </Card>
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
    <Card role="status" aria-label="Cargando movimientos" className="animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex justify-between py-2">
          <div className="h-4 w-32 bg-line rounded" />
          <div className="h-4 w-20 bg-line rounded" />
        </div>
      ))}
    </Card>
  );
}
