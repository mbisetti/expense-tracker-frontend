type AccountLike = {
  currency: string;
  balances?: { currency: string; balance: number }[] | null;
};

// Opciones de un selector de moneda (Sprint 27.1 FR-3/D6).
//
// La lista que el usuario configura en Ajustes **SUMA** opciones; NUNCA las quita (D1). Si
// reemplazara, una tarjeta con deuda en dólares dejaría de ofrecer dólares el día que te
// olvidaste de configurarlos, y la app escondería plata que existe. Una preferencia puede
// agregar opciones; nunca puede ocultar un saldo real.
//
// Orden (D6): lo más probable primero.
//   1. la principal de la cuenta — el caso del 95% de las veces
//   2. el resto de los sub-balances que la cuenta YA tiene
//   3. las configuradas que falten
//   4. la favorita, si no entró por ninguna de las anteriores
// `"Otra…"` lo agrega el componente al final; no es una moneda.
export function currencyOptionsFor(
  account: AccountLike | undefined,
  workingCurrencies: string[] | undefined,
  favoriteCurrency: string | undefined,
): string[] {
  const ordered: string[] = [];
  const push = (c: string | undefined | null) => {
    if (!c) return;
    const code = c.trim().toUpperCase();
    if (code && !ordered.includes(code)) ordered.push(code);
  };

  push(account?.currency);
  (account?.balances ?? []).forEach((b) => push(b.currency));
  (workingCurrencies ?? []).forEach(push);
  push(favoriteCurrency);

  return ordered;
}

/**
 * S25.7 — opciones para un selector que NO cuelga de una cuenta puntual: el alta de un gasto
 * recurrente, que no tiene cuenta asociada.
 *
 * Mismo principio que `currencyOptionsFor` y por el mismo motivo: la lista **suma, nunca resta**.
 * El formulario de recurrentes recibía `[monedaActual]`, o sea UNA sola opción, así que no había
 * literalmente nada para elegir. Con una cuenta nueva en dólares no había forma de cargar un
 * recurrente en dólares: el selector mostraba ARS y ningún camino hacia USD.
 *
 * Orden: la actual primero (venís del tab de esa moneda, es la que más probablemente querés),
 * después TODAS las de tus cuentas —incluidos los sub-balances de las mixtas—, después lo
 * configurado en Ajustes, y la favorita al final si no entró por ninguna.
 */
export function currencyOptionsForAny(
  current: string | undefined,
  accounts: AccountLike[] | undefined,
  workingCurrencies: string[] | undefined,
  favoriteCurrency: string | undefined,
): string[] {
  const ordered: string[] = [];
  const push = (c: string | undefined | null) => {
    if (!c) return;
    const code = c.trim().toUpperCase();
    if (code && !ordered.includes(code)) ordered.push(code);
  };

  push(current);
  (accounts ?? []).forEach((a) => {
    push(a.currency);
    (a.balances ?? []).forEach((b) => push(b.currency));
  });
  (workingCurrencies ?? []).forEach(push);
  push(favoriteCurrency);

  return ordered;
}
