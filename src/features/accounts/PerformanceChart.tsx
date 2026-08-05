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
import { monthShortLabel } from '../../lib/months';
import type { PerformanceMonth } from './api';

type PerformanceChartProps = {
  series: PerformanceMonth[];
  currency: string;
};

const compact = new Intl.NumberFormat('es-AR', { notation: 'compact' });

// S40 (D3): 12 meses, barras agrupadas APORTES vs RENDIMIENTO.
//
// Los retiros van como aporte NEGATIVO en la misma barra: son la misma pregunta ("cuánta plata
// mía entró o salió este mes") y separarlos en una tercera serie llenaba el gráfico de barras
// vacías. El % del mes vive en el tooltip y no en la card: un mes suelto desinforma (Marko).
export function PerformanceChart({ series, currency }: PerformanceChartProps) {
  const data = series.map((m) => ({
    label: monthShortLabel(m.month),
    contributions: m.contributions - m.withdrawals,
    yield: m.yield,
    // El % del mes contra el saldo con el que arrancó: es la única base honesta. Sin saldo
    // inicial no hay porcentaje que calcular (dividir por 0 no da un número, da un infinito).
    pct: m.startingBalance > 0 ? (m.yield / m.startingBalance) * 100 : null,
  }));

  return (
    <figure
      aria-label={`Aportes y rendimiento de los últimos 12 meses en ${currency}`}
      className="m-0"
    >
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
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text)',
            }}
            formatter={(value, name, item) => {
              const amount = typeof value === 'number' ? value : 0;
              // El % del mes viaja SÓLO acá (D3): en la card sería un mes suelto, y un mes suelto
              // desinforma. `pct` es null cuando el mes arrancó sin saldo — no hay base contra
              // la que medir.
              const pct = (item as { payload?: { pct: number | null } })?.payload?.pct;
              if (name === 'Rendimiento' && pct != null) {
                return [`${formatMoney(amount, currency)} (${pct.toFixed(1)}%)`, name];
              }
              return [formatMoney(amount, currency), name];
            }}
          />
          <Legend wrapperStyle={{ color: 'var(--text)', fontSize: 12 }} />
          {/* Aportes en el gris de texto fuerte y rendimiento en verde: la plata que ponés vos
              no es una ganancia, y que compartan color sería justo el error que D1 evita. */}
          <Bar dataKey="contributions" name="Aportes" fill="var(--text-h)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="yield" name="Rendimiento" fill="var(--income)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </figure>
  );
}
