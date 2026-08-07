import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { ApiError } from '../../lib/http';
import type {
  CreateHoldingInput,
  Holding,
  Holdings,
  TradeInput,
  TradeResult,
  UpdateHoldingInput,
} from './api';

/**
 * S43 — las tenencias de una cuenta cripto.
 *
 * <p>No cuelgan de `['accounts']` a propósito, mismo criterio que `useAccountPerformance`: es una
 * vista aparte y más cara (el server cotiza contra un proveedor externo) que sólo se pide cuando
 * hay una cuenta CRYPTO en pantalla. Meterlas en el GET de cuentas habría hecho que listar las
 * cuentas dependiera de que CoinGecko esté arriba.
 *
 * <p>`staleTime` de 5 minutos: el server cachea los precios 10, así que re-pedir en cada foco de
 * ventana sería pegarle a la API para recibir el mismo número.
 */
export function useHoldings(accountId: string | undefined, enabled = true) {
  const http = useHttp();
  return useQuery({
    queryKey: ['holdings', accountId],
    queryFn: () => http<Holdings>(`/accounts/${accountId}/holdings`),
    enabled: Boolean(accountId) && enabled,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Alta, corrección, borrado y trades.
 *
 * <p>Qué se invalida y por qué: `['holdings']` siempre (cambió el desglose). El resto SÓLO en el
 * trade, y sólo porque puede haber creado el gasto de la comisión — la compra en sí no mueve el
 * ledger (D2), así que invalidar `['accounts']` en un alta manual sería pedirle al backend que
 * recalcule balances que nadie tocó.
 */
export function useHoldingMutations(accountId: string) {
  const http = useHttp();
  const queryClient = useQueryClient();

  const invalidateHoldings = () => {
    queryClient.invalidateQueries({ queryKey: ['holdings', accountId] });
  };

  const create = useMutation<Holding, ApiError, CreateHoldingInput>({
    mutationFn: (input) =>
      http<Holding>(`/accounts/${accountId}/holdings`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: invalidateHoldings,
  });

  const update = useMutation<Holding, ApiError, { id: string; changes: UpdateHoldingInput }>({
    mutationFn: ({ id, changes }) =>
      http<Holding>(`/accounts/${accountId}/holdings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(changes),
      }),
    onSuccess: invalidateHoldings,
  });

  const remove = useMutation<void, ApiError, string>({
    mutationFn: (id) =>
      http<void>(`/accounts/${accountId}/holdings/${id}`, { method: 'DELETE' }),
    onSuccess: invalidateHoldings,
  });

  const trade = useMutation<TradeResult, ApiError, TradeInput>({
    mutationFn: (input) =>
      http<TradeResult>(`/accounts/${accountId}/holdings/trades`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (result) => {
      invalidateHoldings();
      // Sólo si hubo comisión en plata: eso SÍ es un gasto real que movió el balance, el mes y
      // el rendimiento. Sin comisión no se invalida nada más porque nada más cambió.
      if (result.feeTransactionId) {
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
        queryClient.invalidateQueries({ queryKey: ['account-performance'] });
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['summary'] });
      }
    },
  });

  return { create, update, remove, trade };
}
