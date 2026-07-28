import { ApiError } from '../../lib/http';

// Copy en castellano de los códigos de V36. Mismo patrón que transactions/errorMessages.
const MESSAGES: Record<string, string> = {
  PERSON_NOT_FOUND: 'No encontramos a esa persona.',
  PERSON_ALREADY_EXISTS: 'Ya tenés a alguien con ese nombre.',
  PERSON_HAS_PENDING_SHARES:
    'Esta persona todavía te debe plata. Cobrale (o deshacé el reparto) antes de borrarla.',
  SHARE_NOT_FOUND: 'No encontramos esa parte del gasto.',
  SHARES_EXCEED_TOTAL: 'Lo que repartiste supera el total del gasto.',
  SHARE_ALREADY_SETTLED:
    'Esa persona ya te pagó. Deshacé el cobro antes de cambiar cuánto le tocaba.',
  NOT_A_SHAREABLE_EXPENSE: 'Solo se puede compartir un gasto común.',
  NOT_AN_ASSET_ACCOUNT: 'Elegí una cuenta donde puedas recibir plata (no una tarjeta).',
  DUPLICATE_PERSON_IN_SHARES: 'Pusiste a la misma persona dos veces.',
  AMOUNT_BELOW_SHARES:
    'El monto nuevo es menor a lo que ya repartiste con otros. Ajustá el reparto primero.',
  INSUFFICIENT_BALANCE: 'La cuenta no tiene saldo suficiente.',
};

export function sharedErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.code && MESSAGES[error.code]) {
    return MESSAGES[error.code];
  }
  return 'No pudimos guardar los cambios. Intentá de nuevo.';
}
