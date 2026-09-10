import type { Account } from '../accounts/api';

/**
 * S50 (D2): el `value` con el que arranca el `<Select>` "Método de pago" de un formulario, para
 * la cuenta elegida.
 *
 * Devuelve el mismo formato de value que los selects ya usan desde S22.2 (D6):
 * - `"<uuid>"` si el predeterminado de la cuenta es un PaymentMethod,
 * - `"card:<uuid>"` si es una tarjeta vinculada (elegirla RUTEA la tx a esa cuenta),
 * - `""` si la cuenta no tiene predeterminado, o no hay cuenta.
 *
 * Es una función pura sobre el `Account` que los cuatro formularios ya tienen en la mano, y no un
 * hook con fetch: los cuatro ya traen `useAccounts()`, así que un `useQuery` más acá sería una
 * request por formulario para un dato que ya está en cache.
 *
 * `withCards` existe porque **sólo `TransactionForm` ofrece las tarjetas vinculadas** como opción
 * del método. En los otros tres, devolver `"card:<uuid>"` pondría en el `<Select>` un value que no
 * está entre sus `<option>`: el navegador lo muestra en blanco, sin error y sin explicación.
 */
export function defaultMethodValue(
  account: Account | undefined,
  { withCards = false }: { withCards?: boolean } = {},
): string {
  if (!account) return '';
  if (account.defaultPaymentMethodId) return account.defaultPaymentMethodId;
  if (withCards && account.defaultCardAccountId) return `card:${account.defaultCardAccountId}`;
  return '';
}
