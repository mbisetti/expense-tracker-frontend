import { Skeleton } from '../../components/ui/Skeleton';

export function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Skeleton variant="card" />
        <Skeleton variant="card" />
        <Skeleton variant="card" />
        <Skeleton variant="card" />
      </div>
      <Skeleton variant="chart" />
    </div>
  );
}

export function ChartSkeleton() {
  return <Skeleton variant="chart" />;
}

export function ListSkeleton() {
  return <Skeleton variant="list" rows={5} />;
}
