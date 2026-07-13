import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../auth/context';
import { BudgetSection } from './BudgetSection';
import { jsonResponse, ok } from '../../test/mockResponse';

const fail = () => jsonResponse(500, { error: 'INTERNAL', message: 'boom' });

function renderSection() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 'test-token', status: 'authenticated', setAccessToken: () => {} }}
      >
        <BudgetSection />
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('BudgetSection', () => {
  it('muestra los estados ok, warning y exceeded según el gasto', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        ok({
          budgets: [
            {
              budgetId: 'b1',
              categoryId: 'c1',
              categoryName: 'Comida',
              currency: 'ARS',
              limitAmount: 100000,
              spentAmount: 45000,
            },
            {
              budgetId: 'b2',
              categoryId: 'c2',
              categoryName: 'Transporte',
              currency: 'ARS',
              limitAmount: 100000,
              spentAmount: 85000,
            },
            {
              budgetId: 'b3',
              categoryId: 'c3',
              categoryName: 'Entretenimiento',
              currency: 'ARS',
              limitAmount: 100000,
              spentAmount: 120000,
            },
          ],
        }),
      ),
    );

    renderSection();

    expect(await screen.findByText('En presupuesto')).toBeInTheDocument();
    expect(screen.getByText('Cerca del límite')).toBeInTheDocument();
    expect(screen.getByText('Excedido')).toBeInTheDocument();

    const bars = screen.getAllByRole('progressbar');
    // valuenow clampeado a 100 (ARIA); el % real viaja en valuetext
    expect(bars.map((bar) => bar.getAttribute('aria-valuenow'))).toEqual(['45', '85', '100']);
    expect(bars.map((bar) => bar.getAttribute('aria-valuetext'))).toEqual(['45%', '85%', '120%']);
  });

  // Revisión 2026-07-13: 100% exacto ES excedido (te queda $0); warning es [80%, 100%)
  it('80% exacto es warning y 100% exacto es exceeded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        ok({
          budgets: [
            {
              budgetId: 'b1',
              categoryId: 'c1',
              categoryName: 'Justo 80',
              currency: 'ARS',
              limitAmount: 100000,
              spentAmount: 80000,
            },
            {
              budgetId: 'b2',
              categoryId: 'c2',
              categoryName: 'Justo 100',
              currency: 'ARS',
              limitAmount: 100000,
              spentAmount: 100000,
            },
          ],
        }),
      ),
    );

    renderSection();

    expect(await screen.findByText('Cerca del límite')).toBeInTheDocument();
    expect(screen.getByText('Excedido')).toBeInTheDocument();
  });

  it('muestra empty state sin presupuestos', async () => {
    vi.stubGlobal('fetch', vi.fn(() => ok({ budgets: [] })));

    renderSection();

    expect(
      await screen.findByText('No definiste presupuestos este mes.'),
    ).toBeInTheDocument();
  });

  it('muestra error si falla el fetch', async () => {
    vi.stubGlobal('fetch', vi.fn(() => fail()));

    renderSection();

    expect(
      await screen.findByText('No pudimos cargar los presupuestos. Intentá de nuevo.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
