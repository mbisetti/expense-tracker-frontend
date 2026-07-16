import type { TransactionType } from '../features/transactions/api';

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

// --- Helpers del MoneyInput (formato es-AR: '.' miles, ',' decimal) ---

const groupInt = new Intl.NumberFormat('es-AR');

// Normaliza lo que tipea el usuario a un display es-AR con separador de miles en vivo.
// La coma es el separador decimal; los puntos se tratan como miles (se re-insertan solos),
// así "150.000" queda intacto. Descarta todo lo que no sea dígito o coma → bloquea letras y
// símbolos (el reclamo de "me deja poner letras y simbolos en el monto").
export function formatAmountDisplay(raw: string): string {
  const cleaned = raw.replace(/[^\d,]/g, '');
  const firstComma = cleaned.indexOf(',');
  const hasDecimal = firstComma !== -1;
  const intDigits = (hasDecimal ? cleaned.slice(0, firstComma) : cleaned).replace(/^0+(?=\d)/, '');
  const decDigits = hasDecimal ? cleaned.slice(firstComma + 1).replace(/,/g, '').slice(0, 2) : '';
  const grouped = intDigits === '' ? (hasDecimal ? '0' : '') : groupInt.format(Number(intDigits));
  return hasDecimal ? `${grouped},${decDigits}` : grouped;
}

// Parsea el display de un MoneyInput a número (para submit / previews / diffs).
export function parseAmountInput(display: string): number {
  if (!display) return 0;
  const canonical = display.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
  const n = Number(canonical);
  return Number.isFinite(n) ? n : 0;
}

// Número → display es-AR (para precargar un MoneyInput en edición). 0 / no-finito → vacío.
export function numberToAmountDisplay(n: number): string {
  if (!Number.isFinite(n) || n === 0) return '';
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(n);
}

export function amountSign(type: TransactionType): string {
  return type === 'INCOME' ? '+' : '−';
}

export function amountToneClass(type: TransactionType): string {
  return type === 'INCOME' ? 'text-income' : 'text-expense';
}
