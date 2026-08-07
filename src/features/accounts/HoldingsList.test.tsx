import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../auth/context';
import { HoldingsList } from './HoldingsList';
import { jsonResponse } from '../../test/mockResponse';
import type { Holdings } from './api';

afterEach(() => vi.unstubAllGlobals());

const PRICED: Holdings = {
  accountId: 'a1',
  currency: 'USD',
  priced: true,
  totalValue: 1294.4,
  totalInvested: 850,
  suggestedValue: 1294.4,
  // Ya ordenadas por el server (D4): ETH vale más que BTC aunque el número de BTC sea "más chico".
  holdings: [
    {
      id: 'h2',
      symbol: 'ETH',
      quantity: 0.432,
      invested: 500,
      price: 1900,
      value: 820.8,
      changePct: 64.16,
    },
    {
      id: 'h1',
      symbol: 'BTC',
      quantity: 0.0074,
      invested: 300,
      price: 64000,
      value: 473.6,
      changePct: 57.87,
    },
  ],
};

function renderList(data: Holdings) {
  vi.stubGlobal('fetch', vi.fn(() => jsonResponse(200, data)));
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 't', status: 'authenticated', setAccessToken: () => {} }}
      >
        <HoldingsList accountId="a1" onEditHolding={() => {}} onAddHolding={() => {}} />
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('HoldingsList (S43)', () => {
  it('D4: respeta el orden que mandó el server, NO re-ordena por cantidad', async () => {
    renderList(PRICED);

    // Si el front re-ordenara por cantidad, BTC (0,0074) iría después de ETH (0,432) igual, pero
    // por el motivo equivocado. Lo que se fija acá es que el orden LLEGA HECHO: la lista se
    // renderiza en el orden del array, sin ningún sort propio.
    const symbols = await screen.findAllByText(/^(BTC|ETH)$/);
    expect(symbols.map((el) => el.textContent)).toEqual(['ETH', 'BTC']);
  });

  it('muestra la cantidad SIN ceros de relleno', async () => {
    renderList(PRICED);

    // "0,0074", no "0,00740000": es el número que Marko quiere leer de un vistazo.
    expect(await screen.findByText('0,0074')).toBeInTheDocument();
    expect(screen.queryByText('0,00740000')).not.toBeInTheDocument();
  });

  it('muestra el valor de mercado con ≈ y lo que se puso en cada tenencia', async () => {
    renderList(PRICED);

    expect(await screen.findByText(/≈.*820,80/)).toBeInTheDocument();
    expect(screen.getByText(/pusiste.*500,00/)).toBeInTheDocument();
    // El total arriba, con el "≈" también: el precio tiene hasta 10 minutos de cache.
    expect(screen.getByText(/En cripto ≈/)).toBeInTheDocument();
  });

  it('el signo del cambio va explícito, el color no comunica solo (§1.6)', async () => {
    renderList(PRICED);

    expect(await screen.findByText('+64,16%')).toBeInTheDocument();
  });

  it('§7.9: sin cotizaciones muestra cantidades e invertido, sin ningún ≈', async () => {
    renderList({
      ...PRICED,
      priced: false,
      totalValue: null,
      suggestedValue: null,
      holdings: PRICED.holdings.map((h) => ({ ...h, price: null, value: null, changePct: null })),
    });

    expect(await screen.findByText('0,0074')).toBeInTheDocument();
    expect(screen.getByText(/Sin cotización ahora/)).toBeInTheDocument();
    expect(screen.queryByText(/En cripto ≈/)).not.toBeInTheDocument();
  });

  it('una fila sin precio entre otras con precio no inventa un valor', async () => {
    renderList({
      ...PRICED,
      holdings: [
        PRICED.holdings[0],
        { id: 'h3', symbol: 'BNC', quantity: 2, invested: 80, price: null, value: null, changePct: null },
      ],
    });

    expect(await screen.findByText('BNC')).toBeInTheDocument();
    // Un guión, no un 0: no tener cotización no es valer cero.
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('cuenta sin tenencias: explica para qué sirve en vez de mostrar una lista vacía', async () => {
    renderList({ ...PRICED, priced: false, totalValue: null, suggestedValue: null, holdings: [] });

    expect(await screen.findByText(/Todavía no cargaste qué tenés/)).toBeInTheDocument();
  });

  it('el lápiz de cada fila abre la edición de ESA tenencia', async () => {
    vi.stubGlobal('fetch', vi.fn(() => jsonResponse(200, PRICED)));
    const onEditHolding = vi.fn();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider
          value={{ accessToken: 't', status: 'authenticated', setAccessToken: () => {} }}
        >
          <HoldingsList accountId="a1" onEditHolding={onEditHolding} onAddHolding={() => {}} />
        </AuthContext.Provider>
      </QueryClientProvider>,
    );

    const pencil = await screen.findByRole('button', { name: 'Editar BTC' });
    pencil.click();

    await waitFor(() =>
      expect(onEditHolding).toHaveBeenCalledWith(expect.objectContaining({ symbol: 'BTC' })),
    );
  });
});
