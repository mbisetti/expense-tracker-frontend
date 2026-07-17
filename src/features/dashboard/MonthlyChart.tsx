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
import type { MonthlyBucket } from './api';

type MonthlyChartProps = {
  months: MonthlyBucket[];
  currency: string;
};

const compact = new Intl.NumberFormat('es-AR', { notation: 'compact' });

function monthLabel(month: string): string {
  const [y, m] = month.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('es-AR', { month: 'short' });
}

export function MonthlyChart({ months, currency }: MonthlyChartProps) {
  const data = months.map((bucket) => ({
    label: monthLabel(bucket.month),
    income: bucket.income,
    expense: bucket.expense,
  }));

  return (
    <figure
      aria-label={`Ingresos vs gastos últimos 6 meses ${currency}`}
      className="rounded-xl border border-line bg-surface p-4"
    >
      <h2>Ingresos vs gastos</h2>
      <figcaption className="text-body text-sm">Últimos 6 meses</figcaption>

      {months.length === 0 ? (
        <p>Sin movimientos en los últimos 6 meses.</p>
      ) : (
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
            {/* cursor + contentStyle tematizados: el default de Recharts era un cuadrado
                blanco/gris que no combinaba (9b). Ahora el resalte y la cajita siguen los tokens. */}
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
            <Bar dataKey="income" name="Ingresos" fill="var(--income)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" name="Gastos" fill="var(--expense)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </figure>
  );
}
