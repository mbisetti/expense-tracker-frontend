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
import { Switch } from '../../components/ui/Switch';
import { formatMoney } from '../../lib/money';
import { monthShortLabel } from '../../lib/months';
import { ipcMonthLabel } from '../../lib/quoteLabel';
import type { MonthlyBucket } from './api';

// S49 (D5/D12) — el switch de pesos constantes vive en el encabezado de la figura, y sólo
// cuando la moneda activa es ARS: pesos constantes es para pesos.
export type InflationAdjust = {
  /** Si los montos que se están mostrando vienen ajustados. */
  enabled: boolean;
  /** Si hay IPC en la tabla. Sin datos el switch se muestra deshabilitado, no escondido: que
   *  exista y explique por qué no anda es más honesto que hacer desaparecer la función. */
  available: boolean;
  /** Último mes con IPC publicado, "YYYY-MM". */
  ipcAsOf: string | null;
  onChange: (next: boolean) => void;
};

type MonthlyChartProps = {
  months: MonthlyBucket[];
  currency: string;
  adjust?: InflationAdjust | null;
};

const compact = new Intl.NumberFormat('es-AR', { notation: 'compact' });

function adjustHelper(adjust: InflationAdjust): string {
  if (!adjust.available) return 'Todavía no hay datos del IPC.';
  const base = ipcMonthLabel(adjust.ipcAsOf);
  return adjust.enabled && base
    ? `Montos en pesos de ${base}, según el IPC del INDEC.`
    : 'Montos tal como los anotaste.';
}

export function MonthlyChart({ months, currency, adjust }: MonthlyChartProps) {
  const data = months.map((bucket) => ({
    label: monthShortLabel(bucket.month),
    income: bucket.income,
    expense: bucket.expense,
  }));

  const base = adjust?.enabled ? ipcMonthLabel(adjust.ipcAsOf) : null;
  // Un solo string y no texto partido en JSX (lección S47).
  const caption = base ? `Últimos 6 meses, en pesos de ${base}` : 'Últimos 6 meses';

  return (
    <figure
      aria-label={`Ingresos vs gastos últimos 6 meses ${currency}`}
      className="rounded-xl border border-line bg-surface p-4"
    >
      {/* flex-wrap: en pantallas angostas el switch cae debajo del título en vez de pisar el
          gráfico. items-start para que la etiqueta y su helper no estiren la fila del h2. */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2>Ingresos vs gastos</h2>
          <figcaption className="text-body text-sm">{caption}</figcaption>
        </div>
        {adjust && (
          <Switch
            id="dashboard-inflation-adjust"
            label="Ajustar por inflación"
            checked={adjust.enabled}
            disabled={!adjust.available}
            helper={adjustHelper(adjust)}
            onChange={adjust.onChange}
          />
        )}
      </div>

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
            <Bar dataKey="income" name="Ingresos" fill="var(--income)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" name="Gastos" fill="var(--expense)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </figure>
  );
}
