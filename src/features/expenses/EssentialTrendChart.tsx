import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatMoney } from '../../lib/money';
import { monthShortLabel } from '../../lib/months';
import type { EssentialMonthBucket } from './api';

type EssentialTrendChartProps = {
  months: EssentialMonthBucket[];
  currency: string;
  /** 'YYYY-MM' del mes seleccionado en la tab → se resalta; el resto se atenúa. */
  selectedMonth: string;
};

const compact = new Intl.NumberFormat('es-AR', { notation: 'compact' });

// Sprint 24 (evolución) + S24.2 (C): barras AGRUPADAS (sin stackId), colores identidad
// (esencial=ink, no esencial=ámbar), meses capitalizados y mes seleccionado resaltado.
// Resaltado por `fillOpacity` de Cell (plan B aprobado §C.3: más robusto que ReferenceArea
// sobre eje de categorías) + tick del eje en negrita para ese mes. Lazy, theming por CSS vars.
export function EssentialTrendChart({ months, currency, selectedMonth }: EssentialTrendChartProps) {
  const data = months.map((bucket) => ({
    label: monthShortLabel(bucket.month),
    month: bucket.month,
    essential: bucket.essential,
    nonEssential: bucket.nonEssential,
  }));
  // Mes seleccionado resaltado por fillOpacity (plan B §C.3): el resto se atenúa. Robusto y
  // sin depender del tipado del tick custom de Recharts v3.
  const opacityFor = (month: string) => (month === selectedMonth ? 1 : 0.55);

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
          cursor={{ fill: 'var(--chart-cursor)' }}
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
        <Bar dataKey="essential" name="Esencial" fill="var(--text-h)" radius={[4, 4, 0, 0]} maxBarSize={48}>
          {data.map((d) => (
            <Cell key={d.month} fillOpacity={opacityFor(d.month)} />
          ))}
        </Bar>
        <Bar
          dataKey="nonEssential"
          name="No esencial"
          fill="var(--warning)"
          radius={[4, 4, 0, 0]}
          maxBarSize={48}
        >
          {data.map((d) => (
            <Cell key={d.month} fillOpacity={opacityFor(d.month)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
