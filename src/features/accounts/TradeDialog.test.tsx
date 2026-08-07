import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../auth/context';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { TradeDialog } from './TradeDialog';
import { jsonResponse } from '../../test/mockResponse';
import type { Account, Holdings } from './api';

const ACCOUNT: Account = {
  id: 'a1',
  name: 'Binance',
  type: 'CRYPTO',
  currency: 'USD',
  balance: 1000,
  isInformal: false,
  createdAt: '2026-01-01T00:00:00',
  statementCloseDay: null,
  paymentDueDay: null,
  balances: [{ currency: 'USD', balance: 1000 }],
  institution: null,
  linkedAccountId: null,
};

const HOLDINGS: Holdings = {
  accountId: 'a1',
  currency: 'USD',
  priced: true,
  totalValue: 473.6,
  totalInvested: 300,
  suggestedValue: 1173.6,
  holdings: [
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

afterEach(() => vi.unstubAllGlobals());

/** Devuelve el mock de fetch para poder inspeccionar el body del POST del trade. */
function renderDialog() {
  const fetchMock = vi.fn((_url: string, options?: RequestInit) => {
    if (options?.method === 'POST') {
      return jsonResponse(200, {
        id: 'h1',
        symbol: 'BTC',
        quantity: 0.0084,
        invested: 360,
        removed: false,
        feeTransactionId: null,
      });
    }
    return jsonResponse(200, HOLDINGS);
  });
  vi.stubGlobal('fetch', fetchMock);

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 't', status: 'authenticated', setAccessToken: () => {} }}
      >
        <ToastProvider>
          <TradeDialog account={ACCOUNT} onClose={() => {}} />
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
  return fetchMock;
}

// Los labels de campos requeridos llevan el asterisco (§4 del design system), y "Moneda"
// convive con "Moneda de la comisión": los selectores van anclados para no cruzarse.
const SYMBOL = /^Moneda \*$/;
const QUANTITY = /^Cantidad \*$/;
const FEE = /^Comisión \(USD\)$/;

function fill(label: RegExp | string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function tradeBody(fetchMock: ReturnType<typeof vi.fn>) {
  const call = fetchMock.mock.calls.find(([, options]) => options?.method === 'POST');
  return JSON.parse((call?.[1] as RequestInit).body as string);
}

describe('TradeDialog (S43 D5/D6)', () => {
  it('pre-confirma: dice QUÉ va a pasar antes de tocar Confirmar', async () => {
    renderDialog();

    fill(SYMBOL, 'BTC');
    fill(QUANTITY, '0,001');

    // Regla de la casa desde S32: todo flujo que toca plata se ve antes de anotarse.
    expect(await screen.findByText(/Se suma 0,001 BTC a tus tenencias/)).toBeInTheDocument();
    // Y dice lo que más se malinterpreta: comprar NO mueve el saldo.
    expect(screen.getByText(/El saldo de la cuenta no cambia/)).toBeInTheDocument();
  });

  it('el preview de la comisión en plata la nombra como gasto', async () => {
    renderDialog();

    fill(SYMBOL, 'BTC');
    fill(QUANTITY, '0,001');
    fill(FEE, '2,50');

    expect(await screen.findByText(/Se anota un gasto de/)).toBeInTheDocument();
  });

  it('la comisión en cripto avisa que NO es un gasto', async () => {
    renderDialog();

    fill(SYMBOL, 'BTC');
    fill(QUANTITY, '0,001');
    fireEvent.click(screen.getByRole('switch'));
    fill('Moneda de la comisión', 'BNB');
    fill('Cantidad de la comisión', '0,001');

    expect(
      await screen.findByText(/No cuenta como gasto: no salió plata, salió cripto/),
    ).toBeInTheDocument();
  });

  it('D8: la cantidad admite 8 decimales sin recortar a 2', async () => {
    const fetchMock = renderDialog();

    fill(SYMBOL, 'BTC');
    fill(QUANTITY, '0,00000001');
    fill(/Cuánto pagaste/, '1');

    // Con el default de 2 decimales del MoneyInput esto habría quedado en 0 y el trade sería
    // rechazado (o peor, anotaría otro número).
    expect(await screen.findByText(/Se suma 0,00000001 BTC/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(tradeBody(fetchMock).quantity).toBe(0.00000001));
  });

  it('manda lo que pasó, no cuentas hechas: side, símbolo, cantidad y monto', async () => {
    const fetchMock = renderDialog();

    fill(SYMBOL, 'btc');
    fill(QUANTITY, '0,001');
    fill(/Cuánto pagaste/, '60');
    fill(FEE, '1');
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    await waitFor(() =>
      expect(tradeBody(fetchMock)).toEqual({
        side: 'BUY',
        symbol: 'BTC',
        quantity: 0.001,
        amount: 60,
        fee: 1,
      }),
    );
  });

  it('vender más de lo que tenés se avisa acá, sin viaje al server', async () => {
    const fetchMock = renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Vendí' }));
    fill(SYMBOL, 'BTC');
    await screen.findByText(/Tenés 0,0074 BTC/);
    fill(QUANTITY, '0,02');

    expect(await screen.findByText(/Sólo tenés 0,0074 BTC/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled();
    expect(fetchMock.mock.calls.filter(([, o]) => o?.method === 'POST')).toHaveLength(0);
  });

  it('vender algo que no cargaste manda a cargarlo primero', async () => {
    renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Vendí' }));
    fill(SYMBOL, 'DOGE');
    fill(QUANTITY, '10');

    expect(await screen.findByText(/No tenés DOGE cargado/)).toBeInTheDocument();
  });

  it('media comisión en cripto (símbolo sin cantidad) no se puede confirmar', async () => {
    renderDialog();

    fill(SYMBOL, 'BTC');
    fill(QUANTITY, '0,001');
    fireEvent.click(screen.getByRole('switch'));
    fill('Moneda de la comisión', 'BNB');

    expect(
      await screen.findByText(/Completá la moneda y la cantidad de la comisión juntas/),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled();
  });

  it('el copy del monto cambia entre comprar y vender', async () => {
    renderDialog();

    expect(screen.getByLabelText(/Cuánto pagaste/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Vendí' }));
    expect(await screen.findByLabelText(/Cuánto recibiste/)).toBeInTheDocument();
  });
});
