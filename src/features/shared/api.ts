import { parseAmountInput } from '../../lib/money';

// "Hoy por vos, mañana por mí" — gastos compartidos (V36).
//
// El principio que ordena todo: hay DOS números y no se mezclan.
//   · totalAmount  → lo que salió de la cuenta (saldo, feed, resumen bancario)
//   · yourAmount   → lo que gastaste vos (mes, categorías, presupuestos)
// El backend guarda el total en la transacción y `sharedAmount` con la parte ajena; tu parte
// es la resta. Cobrar no cambia ninguno de los dos: solo mueve el saldo.

export type Person = {
  id: string;
  name: string;
  createdAt: string;
};

export type Share = {
  id: string;
  personId: string;
  personName: string;
  amount: number;
  /** Derivado en el server: hay un movimiento de cobro vivo apuntando a esta parte. */
  settled: boolean;
  settlementTransactionId: string | null;
  settlementAccountId: string | null;
  settlementDate: string | null;
};

export type SharedExpense = {
  transactionId: string;
  description: string | null;
  date: string;
  currency: string;
  totalAmount: number;
  sharedAmount: number;
  yourAmount: number;
  shares: Share[];
};

export type ShareInput = {
  personId: string;
  amount: number;
};

export type PendingAmount = {
  currency: string;
  amount: number;
};

export type PendingShareItem = {
  shareId: string;
  transactionId: string;
  date: string;
  description: string | null;
  amount: number;
  currency: string;
};

export type PersonPending = {
  personId: string;
  name: string;
  pending: PendingAmount[];
  shares: PendingShareItem[];
};

export type SharedSummary = {
  people: PersonPending[];
};

export type SettleInput = {
  accountId: string;
  paymentMethodId?: string;
  date?: string;
};

// ── S40 (Bloque C): "Debés" — la dirección inversa de todo lo de arriba ──────────────────────
//
// El principio también se invierte, y es el que hace que los números cierren: el gasto cuenta
// EL DÍA QUE PASÓ. "Bauti pagó la cena, 20k" es tu gasto del martes —entra al mes, a la
// categoría y al presupuesto— aunque le devuelvas la plata el viernes. Devolvérsela es una
// transferencia, y una transferencia nunca es gasto.

export type PersonDebtItem = {
  debtId: string;
  transactionId: string;
  date: string;
  description: string | null;
  /** De qué fue. A diferencia del cobro (plata volviendo), esto ES un gasto y se categoriza. */
  categoryName: string | null;
  amount: number;
  currency: string;
};

export type PersonOwed = {
  personId: string;
  name: string;
  owed: PendingAmount[];
  debts: PersonDebtItem[];
};

export type PersonDebts = {
  /** La cuenta sistema "Deudas con amigos". null hasta que anotás la primera deuda. */
  accountId: string | null;
  people: PersonOwed[];
};

export type PersonDebtInput = {
  /** Una de las dos: la elegiste del selector, o la tipeaste (se crea al vuelo). */
  personId?: string;
  personName?: string;
  amount: number;
  currency?: string;
  date?: string;
  categoryId?: string;
  description?: string;
};

/** Sin método de pago: saldar es una transferencia, no un gasto. */
export type SettleDebtInput = {
  accountId: string;
  date?: string;
};

/** Totales por moneda de una lista de pendientes — sirve para los dos lados del bloque. */
export function totalsByCurrency(amounts: PendingAmount[][]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const list of amounts) {
    for (const { currency, amount } of list) {
      totals.set(currency, (totals.get(currency) ?? 0) + amount);
    }
  }
  return totals;
}

/**
 * Reparto en partes iguales entre vos y `peopleCount` personas.
 *
 * El resto de la división cae SIEMPRE de tu lado: 30.001 ÷ 3 da 10.000 para cada uno y 10.001
 * para vos. Es la única repartición que no obliga a cobrarle a nadie un centavo de más, y
 * mantiene la suma exacta contra el total (sin esto, el server rechaza por SHARES_EXCEED_TOTAL
 * o quedan diferencias de redondeo que nadie sabe a quién reclamar).
 */
export function splitEvenly(total: number, peopleCount: number): number[] {
  if (peopleCount <= 0) return [];
  const totalCents = Math.round(total * 100);
  const shareCents = Math.floor(totalCents / (peopleCount + 1));
  return Array.from({ length: peopleCount }, () => shareCents / 100);
}

/** Lo que te queda a vos = total − partes ajenas. Puede ser 0 (gasto 100% de otro). */
export function yourPart(total: number, shares: number[]): number {
  const sharedCents = shares.reduce((sum, amount) => sum + Math.round(amount * 100), 0);
  return (Math.round(total * 100) - sharedCents) / 100;
}

/** Una fila del reparto en el form. El monto es display string porque lo edita un MoneyInput. */
export type ShareRow = { personId: string; amount: string };

export type ShareMode = 'even' | 'manual';

/**
 * Los montos efectivos del reparto.
 *
 * En "partes iguales" NO se guardan: se derivan del total en el momento. Guardarlos obligaba a un
 * useEffect que los recalculara cada vez que cambiaba el monto del gasto — cascada de renders y
 * una fuente de verdad duplicada que se desincroniza justo cuando el usuario tipea rápido.
 */
export function shareAmounts(rows: ShareRow[], mode: ShareMode, total: number): number[] {
  return mode === 'even'
    ? splitEvenly(total, rows.length)
    : rows.map((row) => parseAmountInput(row.amount));
}

/** ¿El reparto se puede guardar? Montos positivos y tu parte no negativa. */
export function isShareValid(rows: ShareRow[], mode: ShareMode, total: number): boolean {
  if (rows.length === 0) return true;
  const amounts = shareAmounts(rows, mode, total);
  if (amounts.some((amount) => !(amount > 0))) return false;
  return yourPart(total, amounts) >= 0;
}
