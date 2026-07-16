type BalancePoint = { date: string; balance: number };

type BalanceSparklineProps = {
  /** Saldos con fecha, en orden cronológico ascendente. */
  points: BalancePoint[];
  className?: string;
};

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// Mini-gráfico del saldo de la cuenta sobre ~3 meses, con marcas de mes abajo (Sprint 21).
// Dato NEUTRO → color `--body` (§1.5 design-principles). SVG inline en vez de Recharts: sin
// el tooltip/cuadrado del hover, liviano por tarjeta. Los paths van en un viewBox estirado
// (preserveAspectRatio=none) para llenar el ancho; las etiquetas de mes son HTML posicionadas
// por porcentaje, así el texto no se deforma con el estiramiento.
export function BalanceSparkline({ points, className }: BalanceSparklineProps) {
  if (points.length < 2) return null;

  const times = points.map((p) => new Date(p.date + 'T00:00:00').getTime());
  const minT = times[0];
  const maxT = times[times.length - 1];
  const spanT = maxT - minT || 1;

  const balances = points.map((p) => p.balance);
  const minB = Math.min(...balances);
  const maxB = Math.max(...balances);
  const rangeB = maxB - minB || 1;

  const H = 40;
  const PAD = 2;
  const xOf = (t: number) => ((t - minT) / spanT) * 100;
  const yOf = (b: number) => PAD + (H - PAD * 2) * (1 - (b - minB) / rangeB);

  const coords = points.map((p, i) => [xOf(times[i]), yOf(p.balance)] as const);
  const line = coords
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`)
    .join(' ');
  const area = `${line} L${coords[coords.length - 1][0].toFixed(2)} ${H} L${coords[0][0].toFixed(2)} ${H} Z`;

  // Marcas de mes (primer día de cada mes dentro del rango).
  const ticks: { x: number; label: string }[] = [];
  const cursor = new Date(new Date(minT).getFullYear(), new Date(minT).getMonth(), 1);
  if (cursor.getTime() < minT) cursor.setMonth(cursor.getMonth() + 1);
  while (cursor.getTime() <= maxT) {
    ticks.push({ x: xOf(cursor.getTime()), label: MONTHS[cursor.getMonth()] });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return (
    <div className={['w-full text-body', className ?? ''].join(' ').trim()}>
      <svg
        viewBox={`0 0 100 ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Saldo de los últimos meses"
        className="h-12 w-full"
      >
        <path d={area} fill="currentColor" fillOpacity={0.08} />
        <path
          d={line}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {ticks.length > 0 && (
        <div className="relative mt-1 h-3">
          {ticks.map((t, i) => (
            <span
              key={i}
              style={{ left: `${t.x}%` }}
              className="absolute -translate-x-1/2 text-[10px] tabular-nums text-muted"
            >
              {t.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
