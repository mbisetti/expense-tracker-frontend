// Delta vs un valor anterior (mes anterior). Base 0 y actual > 0 → "nuevo" (no ∞%); base 0 y
// actual 0 → sin cambio. Devuelve el % absoluto + la dirección para el ícono/color.
export type Delta = { text: string; direction: 'up' | 'down' | 'flat' | 'new' };

export function deltaVsPrev(current: number, prev: number): Delta {
  if (prev === 0) {
    return current > 0 ? { text: 'Nuevo', direction: 'new' } : { text: '—', direction: 'flat' };
  }
  const pct = Math.round(((current - prev) / prev) * 100);
  if (pct === 0) return { text: '0%', direction: 'flat' };
  return { text: `${Math.abs(pct)}%`, direction: pct > 0 ? 'up' : 'down' };
}
