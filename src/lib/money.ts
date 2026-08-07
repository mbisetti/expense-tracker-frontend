const plain = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// `Intl.NumberFormat({ style: 'currency', currency })` tira "invalid currency code" si
// `currency` no es un código de 3 letras bien formado (vacío, "AR", "peso"…). Eso puede pasar
// legítimamente en la UI antes de que el usuario elija una cuenta/moneda, y NUNCA debe crashear
// la app (antes escalaba al ErrorBoundary del router). Degradamos con gracia en su lugar.
export function formatMoney(amount: number, currency: string): string {
  const code = currency?.trim().toUpperCase() ?? '';
  if (!/^[A-Z]{3}$/.test(code)) {
    return plain.format(amount);
  }
  try {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: code }).format(amount);
  } catch {
    return `${code} ${plain.format(amount)}`;
  }
}

// Nombre en castellano de una moneda, en plural y minúscula, para armar frases: "Compras en
// pesos", "Compras en dólares" (Sprint 27 D9).
//
// El naming no es cosmético. El resumen del banco muestra un "total a pagar en pesos" que
// incluye los dólares convertidos MÁS los impuestos; la app muestra las compras separadas y
// limpias. Son números distintos a propósito, y llamarle "Deuda en pesos" al renglón haría que
// el usuario compare contra el banco y crea que la app está mal. Las monedas sin nombre caen al
// código, que es honesto y no inventa nada.
const CURRENCY_NOUNS: Record<string, string> = {
  ARS: 'pesos',
  USD: 'dólares',
  EUR: 'euros',
  BRL: 'reales',
  GBP: 'libras',
  CLP: 'pesos chilenos',
  UYU: 'pesos uruguayos',
};

export function currencyNoun(currency: string): string {
  const code = currency?.trim().toUpperCase() ?? '';
  return CURRENCY_NOUNS[code] ?? code;
}

// --- Helpers del MoneyInput (formato es-AR: '.' miles, ',' decimal) ---

const groupInt = new Intl.NumberFormat('es-AR');

/**
 * S43 (D8): cuántos decimales admite un monto. 2 para plata (es lo que guarda la base:
 * `NUMERIC(15,2)`), 8 para una cantidad de cripto — 0.0074 BTC no entra en dos.
 *
 * Default 2 a propósito: ningún form existente cambia de comportamiento por esta prop.
 */
export const DEFAULT_MAX_DECIMALS = 2;

// Normaliza lo que tipea el usuario a un display es-AR con separador de miles en vivo.
// La coma es el separador decimal; los puntos se tratan como miles (se re-insertan solos),
// así "150.000" queda intacto. Descarta todo lo que no sea dígito o coma → bloquea letras y
// símbolos (el reclamo de "me deja poner letras y simbolos en el monto").
export function formatAmountDisplay(raw: string, maxDecimals = DEFAULT_MAX_DECIMALS): string {
  const cleaned = raw.replace(/[^\d,]/g, '');
  const firstComma = cleaned.indexOf(',');
  const hasDecimal = firstComma !== -1;
  const intDigits = (hasDecimal ? cleaned.slice(0, firstComma) : cleaned).replace(/^0+(?=\d)/, '');
  const decDigits = hasDecimal
    ? cleaned.slice(firstComma + 1).replace(/,/g, '').slice(0, maxDecimals)
    : '';
  const grouped = intDigits === '' ? (hasDecimal ? '0' : '') : groupInt.format(Number(intDigits));
  return hasDecimal ? `${grouped},${decDigits}` : grouped;
}

/**
 * Dónde tiene que quedar el cursor después de reformatear, contando por **dígitos** y no por
 * caracteres.
 *
 * El MoneyInput es un input controlado que se reformatea en cada tecla, así que el valor del DOM
 * cambia y el navegador manda el cursor al final. Contar caracteres no alcanza para restaurarlo:
 * los separadores de miles los pone el formateador y se corren solos (borrar un dígito de
 * "490.000" saca un punto de lugar). Lo que sí es estable es cuántos caracteres *significativos*
 * —dígitos y la coma decimal— quedaron a la izquierda del cursor.
 *
 * @param display   el texto YA formateado
 * @param significant cuántos dígitos/comas había antes del cursor en lo que tipeó el usuario
 * @returns el índice donde va el cursor dentro de `display`
 */
export function caretAfterSignificant(display: string, significant: number): number {
  if (significant <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < display.length; i++) {
    if (/[\d,]/.test(display[i])) {
      seen += 1;
      if (seen === significant) return i + 1;
    }
  }
  return display.length;
}

/** Cuántos caracteres significativos (dígitos y coma) hay en un fragmento tipeado. */
export function countSignificant(raw: string): number {
  return raw.replace(/[^\d,]/g, '').length;
}

// Parsea el display de un MoneyInput a número (para submit / previews / diffs).
export function parseAmountInput(display: string): number {
  if (!display) return 0;
  const canonical = display.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
  const n = Number(canonical);
  return Number.isFinite(n) ? n : 0;
}

// Número → display es-AR (para precargar un MoneyInput en edición). 0 / no-finito → vacío.
// S43: `maxDecimals` acompaña al del MoneyInput — precargar 0.0074 con el default de 2 lo
// mostraría como "0,01" y el usuario guardaría eso sin enterarse.
export function numberToAmountDisplay(n: number, maxDecimals = DEFAULT_MAX_DECIMALS): string {
  if (!Number.isFinite(n) || n === 0) return '';
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: maxDecimals }).format(n);
}

/**
 * S43: una cantidad de cripto, sin ceros de relleno. "0.0074", no "0,00740000".
 *
 * Va aparte de `formatMoney` porque NO es plata: no lleva símbolo de moneda ni dos decimales
 * fijos. Y va aparte de `numberToAmountDisplay` porque ese devuelve vacío en 0 (sirve para
 * precargar un input, no para mostrar un número).
 */
export function formatQuantity(n: number, maxDecimals = 8): string {
  if (!Number.isFinite(n)) return '0';
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: maxDecimals }).format(n);
}

// FASE 3: se borraron amountSign y amountToneClass (hallazgo F3). Cero usos en todo el repo,
// ni siquiera en money.test.ts. El signo y el tono los resuelve components/ui/Amount.tsx.
