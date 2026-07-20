import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatMoney } from '../../lib/money';

export type DonutSlice = { name: string; value: number; color: string };

type CategoryDonutProps = {
  slices: DonutSlice[];
  currency: string;
};

// Sprint 24: donut de gastos por categoría (top 8 + "Otras"). Lazy (import de Recharts nuevo —
// no engordar el bundle inicial, patrón MonthlyChart). Tooltip tematizado (9b).
export function CategoryDonut({ slices, currency }: CategoryDonutProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={slices}
          dataKey="value"
          nameKey="name"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
          stroke="var(--surface)"
        >
          {slices.map((slice, i) => (
            <Cell key={i} fill={slice.color} />
          ))}
        </Pie>
        <Tooltip
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
      </PieChart>
    </ResponsiveContainer>
  );
}
