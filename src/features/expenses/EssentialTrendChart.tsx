import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatMoney } from '../../lib/money';
import type { EssentialMonthBucket } from './api';

type EssentialTrendChartProps = {
  months: EssentialMonthBucket[];
  currency: string;
};

const compact = new Intl.NumberFormat('es-AR', { notation: 'compact' });

function monthLabel(month: string): string {
  const [y, m] = month.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('es-AR', { month: 'short' });
}

// Sprint 24 (D2/FR-7): evolución apilada esencial/no esencial de 6 meses (zero-filled). Lazy,
// mismo theming por CSS vars que MonthlyChart.
export function EssentialTrendChart({ months, currency }: EssentialTrendChartProps) {
  const data = months.map((bucket) => ({
    label: monthLabel(bucket.month),
    essential: bucket.essential,
    nonEssential: bucket.nonEssential,
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'var(--text)', fontSize: 12 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'var(--text)', fontSize: 12 }}
          tickFormatter={(value: number) => compact.format(value)}
          width={48}
        />
        <Tooltip
          cursor={{ fill: 'var(--surface-sunken)', opacity: 0.6 }}
          contentStyle={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            color: 'var(--text-h)',
          }}
          labelStyle={{ color: 'var(--text-h)' }}
          itemStyle={{ color: 'var(--text-h)' }}
          formatter={(value) => formatMoney(Number(value), currency)}
        />
        <Legend />
        <Bar dataKey="essential" name="Esencial" stackId="a" fill="var(--brand)" radius={[0, 0, 0, 0]} />
        <Bar
          dataKey="nonEssential"
          name="No esencial"
          stackId="a"
          fill="var(--expense)"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
