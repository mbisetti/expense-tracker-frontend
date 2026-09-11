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
import { ReservedText } from '../../components/ui/ReservedText';
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

// `enabled` entra por parámetro y no se lee de `adjust` para poder pedir las DOS versiones del
// texto: la vigente y la del switch prendido, que es la más larga y la que reserva el lugar.
function adjustHelper(adjust: InflationAdjust, enabled: boolean): string {
  if (!adjust.available) return 'Todavía no hay datos del IPC.';
  const base = ipcMonthLabel(adjust.ipcAsOf);
  return enabled && base
    ? `Montos en pesos de ${base}, según el IPC del INDEC.`
    : 'Montos tal como los anotaste.';
}

// Un solo string y no texto partido en JSX (lección S47).
function captionFor(base: string | null, enabled: boolean): string {
  return enabled && base ? `Últimos 6 meses, en pesos de ${base}` : 'Últimos 6 meses';
}

export function MonthlyChart({ months, currency, adjust }: MonthlyChartProps) {
  const data = months.map((bucket) => ({
    label: monthShortLabel(bucket.month),
    income: bucket.income,
    expense: bucket.expense,
  }));

  // El mes base se resuelve SIEMPRE, esté el ajuste prendido o no: con el switch apagado igual se
  // necesita para saber qué tan largo puede llegar a ser el subtítulo y reservarle el lugar.
  const base = ipcMonthLabel(adjust?.ipcAsOf);
  const caption = captionFor(base, !!adjust?.enabled);
  const longestCaption = captionFor(base, true);

  return (
    <figure
      aria-label={`Ingresos vs gastos últimos 6 meses ${currency}`}
      className="rounded-xl border border-line bg-surface p-4"
    >
      {/* flex-wrap: en pantallas angostas el switch cae debajo del título en vez de pisar el
          gráfico. items-start para que la etiqueta y su helper no estiren la fila del h2.

          Tocar el toggle cambia los DOS textos de este encabezado por versiones más largas, y con
          el tamaño atado al contenido la card se reacomodaba en cada toque: el subtítulo ganaba
          ancho (y una línea si no le entraba), el texto auxiliar ganaba una línea, y con
          `justify-between` el toggle se corría solo al ensancharse su propio helper. Las tres cosas
          se arreglan reservando el espacio de antemano. */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        {/* flex-1 + min-w-0: el bloque izquierdo se queda con lo que sobra y el subtítulo envuelve
            adentro, en vez de empujar al de la derecha cuando se alarga. El alto lo reserva
            ReservedText con la variante larga, así no hay ninguna medida a mano. */}
        <div className="min-w-0 flex-1">
          <h2>Ingresos vs gastos</h2>
          <figcaption className="text-body text-sm">
            <ReservedText longest={longestCaption}>{caption}</ReservedText>
          </figcaption>
        </div>
        {/* Ancho fijo, que es lo que ancla el toggle a la derecha del header: su posición deja de
            depender del largo del texto que tiene debajo. Y con el ancho fijo las dos variantes del
            helper envuelven igual, así que el alto que reserva ReservedText es exacto. En mobile el
            bloque pasa a w-full y cae abajo de las pestañas, con la misma reserva. */}
        {adjust && (
          <div className="w-full shrink-0 sm:w-72">
            <Switch
              id="dashboard-inflation-adjust"
              label="Ajustar por inflación"
              checked={adjust.enabled}
              disabled={!adjust.available}
              helper={
                <ReservedText longest={adjustHelper(adjust, true)}>
                  {adjustHelper(adjust, adjust.enabled)}
                </ReservedText>
              }
              onChange={adjust.onChange}
            />
          </div>
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
