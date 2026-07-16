type BalanceSparklineProps = {
  /** Saldos en orden cronológico ascendente (viejo → nuevo). */
  points: number[];
  className?: string;
};

// Sparkline del saldo: un dato NEUTRO (ni chrome de marca ni un semántico income/expense),
// así que va en color neutro (`--body`), no en índigo ni verde/rojo (§1.5 design-principles).
// Se dibuja con SVG inline a propósito: un LineChart de Recharts por cada cuenta sería pesado
// y arrastraría el tooltip/cursor (el "cuadrado" del hover); para una sparkline sin ejes ni
// interacción, un path es lo idiomático y liviano.
export function BalanceSparkline({ points, className }: BalanceSparklineProps) {
  if (points.length < 2) return null;

  const W = 240;
  const H = 40;
  const PAD = 3;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = (W - PAD * 2) / (points.length - 1);

  const coords = points.map((value, i) => {
    const x = PAD + i * stepX;
    const y = PAD + (H - PAD * 2) * (1 - (value - min) / range);
    return [x, y] as const;
  });

  const line = coords
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ');
  const [firstX] = coords[0];
  const [lastX] = coords[coords.length - 1];
  const area = `${line} L${lastX.toFixed(1)} ${H - PAD} L${firstX.toFixed(1)} ${H - PAD} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Tendencia del saldo"
      className={['h-10 w-full text-body', className ?? ''].join(' ').trim()}
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
  );
}
