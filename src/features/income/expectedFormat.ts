import type { BadgeStatus } from '../../components/ui/Badge';
import type { ExpectedIncomeSource } from './api';

export type ExpectedStateBadge = { status: BadgeStatus; label: string };

/**
 * Estado de una fuente esperada, como chip. Espejo de `stateBadge` de los gastos recurrentes
 * (S24.3): es el mismo concepto del otro lado de la plata (esperado vs cargado), así que usa el
 * mismo vocabulario en vez de inventar uno nuevo. El Badge siempre lleva ícono — el color nunca
 * comunica solo.
 *
 * El ámbar se reserva para el caso que importa: no se cargó NADA y el día de cobro ya pasó. Un
 * parcial queda en gris a propósito: una quincenal con la primera cobrada el día 5 no es una
 * alarma el día 6, y pintarla de ámbar apenas entra el primer cobro convertiría el chip en ruido.
 */
export function expectedStateBadge(
  source: Pick<ExpectedIncomeSource, 'expectedCount' | 'receivedCount' | 'billingDay'>,
  dayOfMonth: number,
): ExpectedStateBadge {
  // Anual o semestral fuera de su mes: no se espera nada, no hay nada que reclamar.
  if (source.expectedCount === 0) return { status: 'info', label: 'No vence este mes' };

  const pending = source.expectedCount - source.receivedCount;
  if (pending <= 0) return { status: 'ok', label: 'Cargado' };

  if (source.receivedCount > 0) {
    return { status: 'pending', label: `Parcial ${source.receivedCount}/${source.expectedCount}` };
  }

  return source.billingDay <= dayOfMonth
    ? { status: 'warning', label: 'Sin cargar' }
    : { status: 'pending', label: 'Pendiente' };
}
