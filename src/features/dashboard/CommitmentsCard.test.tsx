import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../auth/context';
import { CommitmentsCard } from './CommitmentsCard';
import { jsonResponse } from '../../test/mockResponse';
import type { Commitments } from './api';

const full: Commitments = {
  month: 8,
  year: 2026,
  byCurrency: [
    {
      currency: 'ARS',
      committedTotal: 245000,
      loansTotal: 145000,
      recurringTotal: 100000,
      expectedIncome: 600000,
      freeAmount: 355000,
      items: [
        { kind: 'LOAN', id: 'l1', name: 'Préstamo Santander', amount: 85000, detail: 'Cuota 3 de 12' },
        { kind: 'LOAN', id: 'l2', name: 'Préstamo del auto', amount: 60000, detail: 'Cuota 8 de 24' },
        { kind: 'RECURRING', id: 'r1', name: 'Alquiler', amount: 100000, detail: null },
      ],
    },
  ],
};

function stubFetch(payload: Commitments) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url.includes('/summary/commitments')) return jsonResponse(200, payload);
      return jsonResponse(200, []);
    }),
  );
}

afterEach(() => vi.unstubAllGlobals());

function renderCard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 't', status: 'authenticated', setAccessToken: () => {} }}
      >
        <MemoryRouter>
          <CommitmentsCard />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('CommitmentsCard', () => {
  it('muestra el total comprometido y cuánto queda libre', async () => {
    stubFetch(full);
    renderCard();

    expect(await screen.findByText('Compromisos del mes')).toBeInTheDocument();
    expect(screen.getByText(/245\.000/)).toBeInTheDocument();
    expect(screen.getByText(/355\.000/)).toBeInTheDocument();
  });

  it('el detalle está colapsado y se abre a pedido', async () => {
    stubFetch(full);
    renderCard();

    await screen.findByText('Compromisos del mes');
    expect(screen.queryByText('Préstamo Santander')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Ver el detalle \(3\)/ }));

    expect(screen.getByText('Préstamo Santander')).toBeInTheDocument();
    // El préstamo dice por qué cuota va; el recurrente no se termina nunca y no lleva "N de M".
    expect(screen.getByText('Cuota 3 de 12')).toBeInTheDocument();
    expect(screen.getByText('Recurrente')).toBeInTheDocument();
  });

  it('cuando los compromisos superan lo que entra, lo dice en rojo y sin negativos raros', async () => {
    stubFetch({
      ...full,
      byCurrency: [{ ...full.byCurrency[0], expectedIncome: 200000, freeAmount: -45000 }],
    });
    renderCard();

    // "Te faltan $45.000" en vez de "queda libre −$45.000", que se lee como un error de la app.
    const shortfall = await screen.findByText(/Te faltan/);
    expect(shortfall.textContent).toContain('45.000,00');
    expect(shortfall.textContent).not.toContain('-');
    expect(screen.queryByText(/queda libre/)).not.toBeInTheDocument();
  });

  it('sin ingresos esperados no inventa el "queda libre": dice qué falta cargar', async () => {
    stubFetch({
      ...full,
      byCurrency: [{ ...full.byCurrency[0], expectedIncome: 0, freeAmount: null }],
    });
    renderCard();

    expect(await screen.findByText(/para ver cuánto te queda libre/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ingresos esperados' })).toHaveAttribute(
      'href',
      '/income',
    );
  });

  it('sin compromisos no se monta: una card en $0 es ruido en el Overview', async () => {
    stubFetch({ month: 8, year: 2026, byCurrency: [] });
    const { container } = render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <AuthContext.Provider
          value={{ accessToken: 't', status: 'authenticated', setAccessToken: () => {} }}
        >
          <MemoryRouter>
            <CommitmentsCard />
          </MemoryRouter>
        </AuthContext.Provider>
      </QueryClientProvider>,
    );

    await vi.waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});
