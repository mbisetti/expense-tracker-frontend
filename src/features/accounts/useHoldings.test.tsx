import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { AuthContext } from '../auth/context';
import { useHoldingMutations, useHoldings } from './useHoldings';
import { jsonResponse } from '../../test/mockResponse';

afterEach(() => vi.unstubAllGlobals());

function wrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 't', status: 'authenticated', setAccessToken: () => {} }}
      >
        {children}
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

describe('useHoldings (S43)', () => {
  it('NO pide nada cuando la cuenta no es cripto (enabled=false)', async () => {
    const fetchMock = vi.fn(() => jsonResponse(200, {}));
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    renderHook(() => useHoldings('a1', false), { wrapper: wrapper(queryClient) });

    // El GET cotiza contra un proveedor externo: dispararlo para una caja de ahorro sería
    // pagarle a CoinGecko por una pregunta que nadie hizo.
    await waitFor(() => expect(fetchMock).not.toHaveBeenCalled());
  });

  it('un trade SIN comisión sólo invalida las tenencias: nada más se movió', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        jsonResponse(200, {
          id: 'h1',
          symbol: 'BTC',
          quantity: 0.01,
          invested: 600,
          removed: false,
          feeTransactionId: null,
        }),
      ),
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useHoldingMutations('a1'), {
      wrapper: wrapper(queryClient),
    });
    result.current.trade.mutate({ side: 'BUY', symbol: 'BTC', quantity: 0.01, amount: 600 });

    await waitFor(() => expect(result.current.trade.isSuccess).toBe(true));

    const keys = invalidate.mock.calls.map(([arg]) => JSON.stringify(arg?.queryKey));
    expect(keys).toEqual([JSON.stringify(['holdings', 'a1'])]);
  });

  it('un trade CON comisión fiat invalida también balance, mes y rendimiento', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        jsonResponse(200, {
          id: 'h1',
          symbol: 'BTC',
          quantity: 0.01,
          invested: 600,
          removed: false,
          feeTransactionId: 'tx1',
        }),
      ),
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useHoldingMutations('a1'), {
      wrapper: wrapper(queryClient),
    });
    result.current.trade.mutate({
      side: 'BUY',
      symbol: 'BTC',
      quantity: 0.01,
      amount: 600,
      fee: 2.5,
    });

    await waitFor(() => expect(result.current.trade.isSuccess).toBe(true));

    // Esa comisión SÍ es un gasto real: movió el saldo, el mes y el rendimiento de la cuenta.
    const keys = invalidate.mock.calls.map(([arg]) => arg?.queryKey?.[0]);
    expect(keys).toContain('holdings');
    expect(keys).toContain('accounts');
    expect(keys).toContain('account-performance');
    expect(keys).toContain('transactions');
    expect(keys).toContain('summary');
  });
});
