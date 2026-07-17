import { Amount } from '../../components/ui/Amount';
import { InfoIcon } from '../../components/ui/icons';
import { formatMoney } from '../../lib/money';
import { useExchangeRate } from '../transfers/useExchangeRate';

type SubBalanceChipProps = {
  currency: string;
  balance: number;
  favoriteCurrency?: string;
};

// Chip de un sub-balance no-principal (Sprint 22). Si su moneda NO es la favorita del usuario,
// muestra un ícono info; al pasar el mouse (o con foco) aparece el equivalente ESTIMADO en la
// moneda favorita, convertido con la cotización del backend (cacheada 1h). Si la moneda del
// chip ya es la favorita, no hay nada que convertir → solo el monto.
export function SubBalanceChip({ currency, balance, favoriteCurrency }: SubBalanceChipProps) {
  const needsConversion = !!favoriteCurrency && currency !== favoriteCurrency;
  const { data: rate } = useExchangeRate(
    needsConversion ? currency : undefined,
    needsConversion ? favoriteCurrency : undefined,
  );
  const converted = needsConversion && rate?.rate != null ? balance * rate.rate : null;

  const message = rate?.unavailable
    ? 'Cotización no disponible'
    : converted != null
      ? `≈ ${formatMoney(converted, favoriteCurrency!)} (estimado)`
      : 'Buscando cotización…';

  return (
    <span className="group relative inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5">
      <Amount amount={balance} currency={currency} tone="neutral" size="sm" />
      {needsConversion && (
        <>
          <button
            type="button"
            aria-label={`Equivalente estimado en ${favoriteCurrency}`}
            className="inline-flex items-center rounded-full text-muted transition-colors duration-200 ease-out hover:text-ink"
          >
            <InfoIcon className="h-3.5 w-3.5" />
          </button>
          <span
            role="tooltip"
            className="pointer-events-none absolute right-0 top-full z-10 mt-1 hidden whitespace-nowrap rounded-md border border-line bg-surface-elevated px-2 py-1 text-xs text-body shadow-md group-hover:block group-focus-within:block"
          >
            {message}
          </span>
        </>
      )}
    </span>
  );
}
