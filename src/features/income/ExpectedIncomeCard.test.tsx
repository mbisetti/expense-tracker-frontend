import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../auth/context';
import { ExpectedIncomeCard } from './ExpectedIncomeCard';
import { jsonResponse, ok } from '../../test/mockResponse';

const fail = () => jsonResponse(500, { error: 'INTERNAL', message: 'boom' });

function renderCard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const { container } = render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 'test-token', status: 'authenticated', setAccessToken: () => {} }}
      >
        <ExpectedIncomeCard />
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
  return container;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('ExpectedIncomeCard', () => {
  it('sin fuentes recurrentes no renderiza nada', async () => {
    vi.stubGlobal('fetch', vi.fn(() => ok({ month: 7, year: 2026, byCurrency: [], sources: [] })));

    const container = renderCard();

    // esperamos a que la query resuelva; después no debería haber contenido
    await waitFor(() => expect(container).toBeEmptyDOMElement());
    expect(screen.queryByText('Ingresos esperados del mes')).not.toBeInTheDocument();
  });

  it('fuente pendiente con billingDay ya pasado se resalta como "no cargado"', async () => {
    vi.setSystemTime(new Date(2026, 6, 15)); // 15 de julio de 2026

    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        ok({
          month: 7,
          year: 2026,
          byCurrency: [{ currency: 'ARS', expectedTotal: 500000, pendingTotal: 500000, pendingCount: 1 }],
          sources: [
            {
              sourceId: 's1',
              name: 'Sueldo',
              currency: 'ARS',
              expectedAmount: 500000,
              billingDay: 5,
              frequency: 'MONTHLY',
              received: false,
            },
          ],
        }),
      ),
    );

    renderCard();

    expect(await screen.findByText('Sueldo')).toBeInTheDocument();
    expect(screen.getByText('no cargado')).toBeInTheDocument();
  });

  it('fuente recibida muestra "cargado" y no se resalta', async () => {
    vi.setSystemTime(new Date(2026, 6, 15));

    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        ok({
          month: 7,
          year: 2026,
          byCurrency: [{ currency: 'ARS', expectedTotal: 500000, pendingTotal: 0, pendingCount: 0 }],
          sources: [
            {
              sourceId: 's1',
              name: 'Sueldo',
              currency: 'ARS',
              expectedAmount: 500000,
              billingDay: 5,
              frequency: 'MONTHLY',
              received: true,
            },
          ],
        }),
      ),
    );

    renderCard();

    expect(await screen.findByText('cargado')).toBeInTheDocument();
    expect(screen.queryByText('no cargado')).not.toBeInTheDocument();
  });

  it('fuente pendiente con billingDay futuro no se resalta como vencida', async () => {
    vi.setSystemTime(new Date(2026, 6, 15));

    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        ok({
          month: 7,
          year: 2026,
          byCurrency: [{ currency: 'ARS', expectedTotal: 300000, pendingTotal: 300000, pendingCount: 1 }],
          sources: [
            {
              sourceId: 's2',
              name: 'Freelance',
              currency: 'ARS',
              expectedAmount: 300000,
              billingDay: 20,
              frequency: 'MONTHLY',
              received: false,
            },
          ],
        }),
      ),
    );

    renderCard();

    expect(await screen.findByText('Freelance')).toBeInTheDocument();
    expect(screen.getByText('pendiente')).toBeInTheDocument();
    expect(screen.queryByText('no cargado')).not.toBeInTheDocument();
  });

  it('muestra error si falla el fetch', async () => {
    vi.stubGlobal('fetch', vi.fn(() => fail()));

    renderCard();

    expect(
      await screen.findByText('No pudimos cargar los ingresos esperados. Intentá de nuevo.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
