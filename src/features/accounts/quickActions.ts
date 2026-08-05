import { isInvestmentAccount, type Account } from './api';

export type QuickAction = 'add' | 'withdraw' | 'pay' | 'adjust';

/**
 * S40 (D4): qué acciones ofrece la card de cada tipo de cuenta.
 *
 * Vive acá y no en el componente por la regla de fast-refresh (un archivo de componente sólo
 * exporta componentes), pero también porque es la REGLA del sprint y merece un lugar propio:
 * hasta S39, INVESTMENT/CRYPTO/DEBT no tenían ninguna lógica que las distinguiera.
 *
 * La cuenta sistema "Deudas con amigos" queda EXPRESAMENTE sin acciones: un pago genérico bajaría
 * el saldo sin cerrar ninguna deuda concreta y el desglose por persona quedaría diciendo que le
 * seguís debiendo a todo el mundo (§7.5). Se salda desde el bloque Debés, que mueve las dos
 * cosas juntas.
 */
export function actionsFor(account: Account): QuickAction[] {
  if (account.systemRole === 'FRIEND_DEBTS') return [];
  if (isInvestmentAccount(account.type)) return ['add', 'withdraw', 'adjust'];
  if (account.type === 'DEBT') return ['pay', 'adjust'];
  return [];
}

/** El copy del botón de ajuste cambia con el tipo: en una deuda no se pregunta cuánto "vale". */
export function adjustLabel(account: Account): string {
  return account.type === 'DEBT' ? 'Ajustar deuda' : 'Actualizar valor';
}

export const QUICK_ACTION_LABELS: Record<Exclude<QuickAction, 'adjust'>, string> = {
  add: 'Agregar plata',
  withdraw: 'Retirar',
  pay: 'Registrar pago',
};

// El título del modal dice QUÉ estás haciendo, no "Nueva transferencia": desde la card de una
// inversión, "Agregar plata a Balanz" es la misma operación contada como la piensa el usuario.
export const TRANSFER_TITLES: Record<Exclude<QuickAction, 'adjust'>, (name: string) => string> = {
  add: (name) => `Agregar plata a ${name}`,
  withdraw: (name) => `Retirar de ${name}`,
  pay: (name) => `Registrar pago de ${name}`,
};
