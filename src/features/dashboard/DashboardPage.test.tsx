import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../auth/context';
import { DashboardPage } from './DashboardPage';

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 'test-token', status: 'authenticated', setAccessToken: () => {} }}
      >
        <DashboardPage />
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('DashboardPage', () => {
  it('muestra un resumen por cada moneda', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              byCurrency: [
                { currency: 'ARS', totalBalance: 200000, monthIncome: 250000, monthExpense: 50000 },
                { currency: 'USD', totalBalance: 100, monthIncome: 0, monthExpense: 0 },
              ],
            }),
        } as Response),
      ),
    );

    renderPage();

    const ars = await screen.findByRole('article', { name: 'Resumen ARS' });
    expect(ars).toHaveTextContent('Balance total');
    expect(ars).toHaveTextContent('$ 200.000,00');
    expect(ars).toHaveTextContent('$ 250.000,00');
    expect(ars).toHaveTextContent('$ 50.000,00');

    const usd = screen.getByRole('article', { name: 'Resumen USD' });
    expect(usd).toHaveTextContent('US$ 100,00');
  });

  it('muestra empty state sin datos', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ byCurrency: [] }),
        } as Response),
      ),
    );

    renderPage();

    expect(
      await screen.findByText(
        'Todavía no hay datos. Creá una cuenta y registrá transacciones para ver el resumen.',
      ),
    ).toBeInTheDocument();
  });
});
