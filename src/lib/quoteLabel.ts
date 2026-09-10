// S49 — cómo se nombran en pantalla la casa del dólar y el mes del IPC.
//
// Puro y sin dependencias: lo usan el banner del dashboard, el helper de transferencias, el
// tooltip de sub-balances y las leyendas de pesos constantes, y ninguno tiene por qué saber
// armar la misma frase por su cuenta.

export type ArsQuote = 'OFICIAL' | 'MEP' | 'BLUE';

const CASA_LABEL: Record<ArsQuote, string> = {
  OFICIAL: 'Oficial',
  MEP: 'MEP',
  BLUE: 'Blue',
};

const MONTH_FMT = new Intl.DateTimeFormat('es-AR', { month: 'long' });

/**
 * "MEP del 9/9". Devuelve null cuando no hay casa, que NO es un error: es el par que no es
 * USD/ARS, o la tabla de índices todavía sin datos. Ahí la pantalla muestra el copy de siempre.
 *
 * Sin fecha devuelve sólo la casa: sirve igual para nombrarla.
 */
export function quoteLabel(
  quote: string | null | undefined,
  quoteDate?: string | null,
): string | null {
  if (!quote || !(quote in CASA_LABEL)) return null;
  const casa = CASA_LABEL[quote as ArsQuote];
  if (!quoteDate) return casa;
  // "2026-09-10" se parte a mano: `new Date('2026-09-10')` lo interpreta en UTC y en Buenos
  // Aires devuelve el día anterior.
  const [, month, day] = quoteDate.split('-');
  if (!month || !day) return casa;
  return `${casa} del ${Number(day)}/${Number(month)}`;
}

/** "2026-07" → "julio 2026". null si no hay mes (todavía no hay IPC en la tabla). */
export function ipcMonthLabel(ym: string | null | undefined): string | null {
  if (!ym) return null;
  const [year, month] = ym.split('-');
  if (!year || !month) return null;
  return `${MONTH_FMT.format(new Date(Number(year), Number(month) - 1, 1))} ${year}`;
}
