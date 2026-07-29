import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../auth/context';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { SharedSection } from './SharedSection';
import { jsonResponse } from '../../test/mockResponse';
import type { SharedSummary } from './api';

const summary: SharedSummary = {
  people: [
    {
      personId: 'p1',
      name: 'Juan',
      pending: [{ currency: 'ARS', amount: 45000 }],
      shares: [
        {
          shareId: 's1',
          transactionId: 't1',
          date: '2026-07-14',
          description: 'Cena parrilla',
          amount: 10000,
          currency: 'ARS',
        },
        {
          shareId: 's2',
          transactionId: 't2',
          date: '2026-07-18',
          description: 'Uber aeropuerto',
          amount: 35000,
          currency: 'ARS',
        },
      ],
    },
    {
      personId: 'p2',
      name: 'Sofía',
      pending: [{ currency: 'USD', amount: 120 }],
      shares: [
        {
          shareId: 's3',
          transactionId: 't3',
          date: '2026-06-02',
          description: 'Hotel',
          amount: 120,
          currency: 'USD',
        },
      ],
    },
  ],
};

function stubFetch(payload: SharedSummary) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url.includes('/summary/shared')) return jsonResponse(200, payload);
      return jsonResponse(200, []);
    }),
  );
}

afterEach(() => vi.unstubAllGlobals());

function renderSection() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 't', status: 'authenticated', setAccessToken: () => {} }}
      >
        <ToastProvider>
          <MemoryRouter>
            <SharedSection />
          </MemoryRouter>
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('SharedSection', () => {
  beforeEach(() => stubFetch(summary));

  it('agrupa lo pendiente por persona y moneda', async () => {
    renderSection();

    expect(await screen.findByText('Juan')).toBeInTheDocument();
    expect(screen.getByText('Sofía')).toBeInTheDocument();
    // Cada persona muestra su propia moneda: la app no consolida en ningún lado.
    expect(screen.getByText(/45\.000/)).toBeInTheDocument();
    expect(screen.getByText(/120/)).toBeInTheDocument();
  });

  it('despliega los gastos pendientes de una persona al tocarla', async () => {
    renderSection();

    const juan = await screen.findByRole('button', { name: /Juan/ });
    expect(screen.queryByText('Cena parrilla')).not.toBeInTheDocument();

    fireEvent.click(juan);

    expect(screen.getByText('Cena parrilla')).toBeInTheDocument();
    expect(screen.getByText('Uber aeropuerto')).toBeInTheDocument();
    expect(juan).toHaveAttribute('aria-expanded', 'true');
  });

  it('sin nada pendiente muestra un empty state con CTA para repartir un gasto', async () => {
    vi.unstubAllGlobals();
    stubFetch({ people: [] });
    renderSection();

    // Confirma que no hay nada que cobrar (en vez de una sección en blanco) y ofrece arrancar.
    expect(await screen.findByText('Nadie te debe nada')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Repartir un gasto' })).toBeInTheDocument();
  });
});
