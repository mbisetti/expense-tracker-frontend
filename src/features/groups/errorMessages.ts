import { ApiError } from '../../lib/http';

// Copy en castellano de los códigos de S47. Mismo patrón que shared/errorMessages.
//
// GROUP_NOT_FOUND llega tanto cuando el grupo no existe como cuando dejaste de ser miembro, y el
// mensaje tiene que servir para los dos casos sin delatar cuál es: el backend los hace
// indistinguibles a propósito.
const MESSAGES: Record<string, string> = {
  GROUP_NOT_FOUND: 'No encontramos ese grupo.',
  NOT_GROUP_OWNER: 'Esto lo puede hacer solamente quien creó el grupo.',
  GROUP_MEMBER_NOT_FOUND: 'No encontramos a esa persona en el grupo.',
  ALREADY_GROUP_MEMBER: 'Ya estás en este grupo.',
  MEMBER_ALREADY_CLAIMED: 'Alguien más ya se quedó con ese lugar. Entrá como alguien nuevo.',
  INVALID_GROUP_INVITE: 'Este link ya no sirve. Pedile uno nuevo a quien te invitó.',
  MEMBER_HAS_OPEN_BALANCE: 'Esa persona todavía tiene cuentas abiertas en el grupo. Salden lo que falta primero.',
  GROUP_HAS_OPEN_BALANCES: 'El grupo todavía tiene cuentas abiertas. Salden todo antes de borrarlo.',
  OWNER_CANNOT_LEAVE: 'Creaste este grupo, así que no podés salir mientras queden otros adentro. Podés borrarlo si ya están todos en cero.',
  NOT_AN_ASSET_ACCOUNT: 'Elegí una cuenta de la que puedas sacar plata, no una tarjeta.',
  ACCOUNT_NOT_FOUND: 'No encontramos esa cuenta.',
  CATEGORY_NOT_FOUND: 'No encontramos esa categoría.',
  PAYMENT_METHOD_NOT_FOUND: 'No encontramos ese método de pago.',
  RATE_LIMIT_EXCEEDED: 'Probaste muchas veces seguidas. Esperá un minuto.',
};

export function groupErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.code && MESSAGES[error.code]) {
    return MESSAGES[error.code];
  }
  return 'No pudimos guardar los cambios. Intentá de nuevo.';
}
