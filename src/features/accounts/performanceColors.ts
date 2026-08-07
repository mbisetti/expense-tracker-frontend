/**
 * El color de un rendimiento lo decide el SIGNO, nunca la serie.
 *
 * Vive en su propio archivo por la regla de fast-refresh (un archivo de componente sólo exporta
 * componentes), pero sobre todo porque es una REGLA y merece un lugar donde se pueda testear:
 * los gráficos de Recharts no tienen tests en el proyecto (en jsdom el ResponsiveContainer mide
 * 0 y no renderiza nada), así que si esto viviera inline no habría forma de fijarlo.
 *
 * Lo que evita: el rendimiento del gráfico estaba pintado con `var(--income)` FIJO, así que un
 * mes que perdió plata se dibujaba —barra, tooltip y leyenda— con el color de haber ganado. Un
 * "−US$ 15,00" en verde dice exactamente lo contrario de lo que pasó.
 *
 * Devuelve los mismos tokens semánticos que usa el resto de la app para los montos (§1.4 de
 * design-principles.md: son SAGRADOS, mismo significado en toda la app).
 */
export function yieldColor(amount: number): string {
  return amount >= 0 ? 'var(--income)' : 'var(--expense)';
}

/**
 * El color del swatch de la leyenda, que es por SERIE y no puede tener dos colores a la vez.
 *
 * Se resuelve por el signo del acumulado de los meses visibles: así la leyenda deja de afirmar
 * "rendimiento = verde" y pasa a decir de qué color viene siendo ESTE gráfico. Las barras y el
 * tooltip siguen mandando dato por dato.
 */
export function seriesYieldColor(amounts: number[]): string {
  return yieldColor(amounts.reduce((total, amount) => total + amount, 0));
}
