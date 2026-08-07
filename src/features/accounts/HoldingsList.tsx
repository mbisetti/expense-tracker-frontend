import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { PencilIcon } from '../../components/ui/icons';
import { formatMoney, formatQuantity } from '../../lib/money';
import { useHoldings } from './useHoldings';
import type { Holding } from './api';

type HoldingsListProps = {
  accountId: string;
  onEditHolding: (holding: Holding) => void;
  onAddHolding: () => void;
};

/**
 * S43 — la lista de qué tenés adentro de la cuenta cripto.
 *
 * <p>Pedido textual de Marko: <em>"que sea más recordatorio de qué tiene y cuánto está valuado…
 * en el detalle ves 0.0074, inversión inicial 3 USD"</em>. De ahí salen las dos columnas: a la
 * izquierda QUÉ tenés, a la derecha CUÁNTO vale y cuánto pusiste.
 *
 * <p><b>El orden viene del server y no se re-ordena acá</b> (D4): por valor de mercado
 * descendente, porque "0,0074 de BTC" puede valer mucho más que "0,432 de ETH" y ordenar por
 * cantidad contestaría otra pregunta. Una sola verdad, del lado que tiene los precios.
 *
 * <p>Sin cotizaciones no se rompe nada: se ven las cantidades y lo invertido, sin ningún "≈" y
 * con una nota que lo dice. El "≈" es literal — el precio tiene hasta 10 minutos de cache y la
 * app nunca finge saber al centavo cuánto vale una cripto.
 */
export function HoldingsList({ accountId, onEditHolding, onAddHolding }: HoldingsListProps) {
  const { data, isPending, isError } = useHoldings(accountId);

  if (isPending) return <Skeleton variant="list" rows={2} />;
  // Un error acá no puede tapar el resto de la card: la cuenta y sus movimientos se ven igual.
  if (isError || !data) return null;

  const { holdings, priced, totalValue, totalInvested, currency } = data;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">Tenencias</span>
        <Button type="button" variant="ghost" size="sm" onClick={onAddHolding}>
          Agregar
        </Button>
      </div>

      {holdings.length === 0 ? (
        <p className="text-sm text-muted">
          Todavía no cargaste qué tenés. Sirve de recordatorio: cuánto de cada moneda y cuánto
          pusiste.
        </p>
      ) : (
        <>
          <p className="text-sm text-body">
            {priced && totalValue !== null && (
              <>
                En cripto ≈{' '}
                <span className="font-semibold tabular-nums text-ink">
                  {formatMoney(totalValue, currency)}
                </span>
                {' · '}
              </>
            )}
            pusiste{' '}
            <span className="tabular-nums text-ink">{formatMoney(totalInvested, currency)}</span>
          </p>

          <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
            {holdings.map((holding) => (
              <HoldingRow
                key={holding.id}
                holding={holding}
                currency={currency}
                onEdit={() => onEditHolding(holding)}
              />
            ))}
          </ul>

          {!priced && (
            <p className="text-xs text-muted">
              Sin cotización ahora. Las cantidades son las tuyas; el valor de mercado vuelve cuando
              el proveedor responda.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function HoldingRow({
  holding,
  currency,
  onEdit,
}: {
  holding: Holding;
  currency: string;
  onEdit: () => void;
}) {
  const { symbol, quantity, invested, value, changePct } = holding;

  return (
    <li className="flex items-center justify-between gap-3 py-1.5">
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium text-ink">{symbol}</span>
        {/* Sin ceros de relleno: "0,0074", no "0,00740000". Es el número que Marko quiere leer. */}
        <span className="text-xs tabular-nums text-muted">{formatQuantity(quantity)}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1">
        <span className="flex flex-col items-end">
          <span className="text-sm tabular-nums text-ink">
            {value === null ? '—' : `≈ ${formatMoney(value, currency)}`}
          </span>
          <span className="text-xs tabular-nums text-muted">
            pusiste {formatMoney(invested, currency)}
            {changePct !== null && (
              <>
                {' · '}
                {/* El signo va explícito y el color acompaña, nunca al revés (§1.6). */}
                <span className={changePct >= 0 ? 'text-income' : 'text-expense'}>
                  {changePct >= 0 ? '+' : '−'}
                  {Math.abs(changePct).toLocaleString('es-AR', { maximumFractionDigits: 2 })}%
                </span>
              </>
            )}
          </span>
        </span>
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Editar ${symbol}`}
          className="flex h-11 w-11 items-center justify-center rounded-sm text-body transition-colors duration-200 ease-out hover:bg-brand-bg hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <PencilIcon className="h-4 w-4" />
        </button>
      </span>
    </li>
  );
}
