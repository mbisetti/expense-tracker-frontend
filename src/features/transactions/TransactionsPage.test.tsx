import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../auth/context';
import { TransactionsPage } from './TransactionsPage';
import { jsonResponse } from '../../test/mockResponse';

const emptyPage = { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 };

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 'test-token', status: 'authenticated', setAccessToken: () => {} }}
      >
        <TransactionsPage />
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('TransactionsPage', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('/transactions')) return jsonResponse(200, emptyPage);
        return jsonResponse(200, []);
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('muestra el empty state cuando no hay transacciones', async () => {
    renderPage();
    expect(await screen.findByText('No hay transacciones para mostrar.')).toBeInTheDocument();
  });

  it('manda el Authorization header en el request', async () => {
    renderPage();
    await screen.findByText('No hay transacciones para mostrar.');
    const fetchMock = vi.mocked(fetch);
    const [, options] = fetchMock.mock.calls[0];
    expect((options?.headers as Record<string, string>).Authorization).toBe('Bearer test-token');
  });

  // Contrato del backend: DELETE /transactions/{id} responde 200 con
  // TransactionResponse completo (accountBalance recalculado), NO 204.
  it('borra con confirmación y maneja el 200-con-body del DELETE', async () => {
    const tx = {
      id: 'tx-1',
      accountId: 'acc-1',
      categoryId: null,
      paymentMethodId: null,
      type: 'EXPENSE',
      amount: 100,
      currency: 'ARS',
      exchangeRateAtTime: null,
      date: '2026-07-01',
      description: 'Super',
      createdAt: '2026-07-01T00:00:00',
    };
    const account = {
      id: 'acc-1',
      name: 'Efectivo',
      type: 'CASH',
      currency: 'ARS',
      balance: 900,
      createdAt: '2026-07-01T00:00:00',
    };
    const oneItemPage = { content: [tx], page: 0, size: 20, totalElements: 1, totalPages: 1 };

    let deleted = false;
    const calls: { url: string; method?: string }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, options?: RequestInit) => {
        calls.push({ url, method: options?.method });
        if (options?.method === 'DELETE') {
          deleted = true;
          return jsonResponse(200, { ...tx, accountBalance: 1000 });
        }
        if (url.includes('/transactions'))
          return jsonResponse(200, deleted ? emptyPage : oneItemPage);
        if (url.includes('/accounts')) return jsonResponse(200, [account]);
        return jsonResponse(200, []);
      }),
    );

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Borrar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sí' }));

    // La invalidación refetchea la lista: si el body del 200 no se parseara bien,
    // la mutación fallaría y aparecería el alert en lugar del empty state.
    expect(await screen.findByText('No hay transacciones para mostrar.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    const deleteCall = calls.find((c) => c.method === 'DELETE');
    expect(deleteCall?.url).toContain('/transactions/tx-1');
  });
});
