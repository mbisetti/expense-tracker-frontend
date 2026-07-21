import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { openSelect, selectOption, selectValue } from '../../test/selectOption';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../auth/context';
import { TransfersPage } from './TransfersPage';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { ok } from '../../test/mockResponse';

const accArs1 = { id: 'acc1', name: 'Banco ARS', type: 'BANK', currency: 'ARS', balance: 5000, isInformal: false, statementCloseDay: null, paymentDueDay: null, balances: [{ currency: 'ARS', balance: 5000 }], createdAt: '2026-01-01T00:00:00' };
const accArs2 = { id: 'acc2', name: 'Ahorro ARS', type: 'BANK', currency: 'ARS', balance: 0, isInformal: false, statementCloseDay: null, paymentDueDay: null, balances: [{ currency: 'ARS', balance: 0 }], createdAt: '2026-01-01T00:00:00' };
const accUsd = { id: 'acc3', name: 'Dolares', type: 'BANK', currency: 'USD', balance: 100, isInformal: false, statementCloseDay: null, paymentDueDay: null, balances: [{ currency: 'USD', balance: 100 }], createdAt: '2026-01-01T00:00:00' };

const transfer = {
  id: 'tr1',
  fromAccountId: 'acc1',
  toAccountId: 'acc2',
  fromAmount: 1500,
  toAmount: 1500,
  fromCurrency: 'ARS',
  toCurrency: 'ARS',
  fee: null,
  exchangeRate: 1,
  date: '2026-07-10',
  description: null,
  fromTransactionId: 'tx1',
  toTransactionId: 'tx2',
  createdAt: '2026-07-10T10:00:00Z',
};

const transfersPageFixture = { content: [transfer], page: 0, size: 20, totalElements: 1, totalPages: 1 };

function stubEndpoints(options?: {
  accounts?: unknown[];
  transfersPage?: unknown;
  onPost?: (body: Record<string, unknown>) => void;
  postResponse?: unknown;
}) {
  const accounts = options?.accounts ?? [accArs1, accArs2, accUsd];
  const transfersPage = options?.transfersPage ?? transfersPageFixture;

  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, requestInit?: RequestInit) => {
      const url = String(input);
      if (url.includes('/transfers') && requestInit?.method === 'POST') {
        const body = JSON.parse(requestInit.body as string);
        options?.onPost?.(body);
        return ok(options?.postResponse ?? { ...transfer, fromAccountBalance: 3500, toAccountBalance: 1500 });
      }
      if (url.includes('/exchange-rates'))
        return ok({ base: 'ARS', target: 'USD', rate: 0.01, asOf: null, unavailable: false });
      if (url.includes('/transfers')) return ok(transfersPage);
      if (url.includes('/accounts')) return ok(accounts);
      throw new Error('URL inesperada: ' + url);
    }),
  );
}

function renderPage(initialEntries: string[] = ['/transfers']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 'test-token', status: 'authenticated', setAccessToken: () => {} }}
      >
        <ToastProvider>
          <MemoryRouter initialEntries={initialEntries}>
            <TransfersPage />
          </MemoryRouter>
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('TransfersPage', () => {
  it('renderiza el form, la lista y el transfer del fixture (origen → destino)', async () => {
    stubEndpoints();
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Nueva transferencia' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Transferencias recientes' })).toBeInTheDocument();
    expect(await screen.findByText('Banco ARS → Ahorro ARS')).toBeInTheDocument();
    expect(screen.getByText('$ 1.500,00')).toBeInTheDocument();
  });

  it('el destino incluye TODAS las cuentas, incluida la misma que el origen (Sprint 22 D3)', async () => {
    stubEndpoints();
    renderPage();

    // Cuenta origen/destino son required: el label agrega un "*" (aria-hidden) → exact:false.
    await selectOption('Cuenta origen', 'acc1', { exact: false });

    const toListbox = await openSelect('Cuenta destino', { exact: false });
    const labels = within(toListbox)
      .getAllByRole('option')
      .map((o) => o.textContent ?? '');
    expect(labels.some((l) => l.includes('Ahorro ARS'))).toBe(true);   // otra ARS
    expect(labels.some((l) => l.includes('Dolares'))).toBe(true);      // USD (cross-currency)
    // Sprint 22: el origen ahora SÍ está (transfer intra-cuenta), marcado "misma cuenta"
    expect(labels.some((l) => l.includes('Banco ARS') && l.includes('misma cuenta'))).toBe(true);
  });

  it('cross-currency: aparece el segundo monto y la cotización sugerida', async () => {
    stubEndpoints();
    renderPage();

    await selectOption('Cuenta origen', 'acc1', { exact: false }); // ARS
    await selectOption('Cuenta destino', 'acc3', { exact: false }); // USD

    // aparece el input de monto a acreditar en la moneda destino
    expect(await screen.findByLabelText(/Monto a acreditar \(USD\)/)).toBeInTheDocument();
    expect(await screen.findByText(/Cotización sugerida/)).toBeInTheDocument();
  });

  it('submit: manda POST con los datos y muestra un toast de éxito con ambos saldos', async () => {
    let postedBody: Record<string, unknown> | undefined;
    stubEndpoints({ onPost: (body) => { postedBody = body; } });
    renderPage();

    await selectOption('Cuenta origen', 'acc1', { exact: false });
    await selectOption('Cuenta destino', 'acc2', { exact: false });
    fireEvent.change(screen.getByLabelText('Monto', { exact: false }), { target: { value: '1500' } });
    fireEvent.click(screen.getByRole('button', { name: 'Transferir' }));

    expect(await screen.findByText(/Transferencia realizada/)).toBeInTheDocument();
    // same-currency: fromAmount == toAmount
    expect(postedBody).toMatchObject({ fromAccountId: 'acc1', toAccountId: 'acc2', fromAmount: 1500, toAmount: 1500 });
    expect(postedBody?.date).toBeTruthy();
  });

  it('sin cuentas: muestra el mensaje y no el form', async () => {
    stubEndpoints({ accounts: [] });
    renderPage();

    expect(await screen.findByText('Necesitás al menos una cuenta para transferir.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Cuenta origen', { exact: false })).not.toBeInTheDocument();
  });

  it('con UNA sola cuenta: el form se muestra (transfer intra-cuenta, Sprint 22)', async () => {
    stubEndpoints({ accounts: [accArs1] });
    renderPage();

    expect(await screen.findByLabelText('Cuenta origen', { exact: false })).toBeInTheDocument();
  });

  it('empty state de transferencias', async () => {
    stubEndpoints({ transfersPage: { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 } });
    renderPage();

    expect(await screen.findByText('Todavía no hiciste transferencias.')).toBeInTheDocument();
  });

  it('con ?to= en la URL, precarga la cuenta destino', async () => {
    stubEndpoints();
    renderPage(['/transfers?to=acc2']);

    await screen.findByLabelText('Cuenta destino', { exact: false });
    await waitFor(() => expect(selectValue('Cuenta destino', { exact: false })).toBe('acc2'));
  });

  it('intra-cuenta cross-currency: permite la misma cuenta con monedas distintas y manda ambas', async () => {
    let postedBody: Record<string, unknown> | undefined;
    stubEndpoints({ onPost: (body) => { postedBody = body; } });
    renderPage();

    await selectOption('Cuenta origen', 'acc1', { exact: false });
    // misma cuenta en el destino (comprar USD dentro de Banco ARS)
    await selectOption('Cuenta destino', 'acc1', { exact: false });
    // moneda destino → "Otra…" → USD
    await selectOption('Moneda destino', '__other__', { exact: false });
    fireEvent.change(screen.getByLabelText('Moneda (3 letras)', { exact: false }), {
      target: { value: 'USD' },
    });

    fireEvent.change(screen.getByLabelText(/Monto a debitar/), { target: { value: '100000' } });
    fireEvent.change(screen.getByLabelText(/Monto a acreditar/), { target: { value: '95' } });
    fireEvent.click(screen.getByRole('button', { name: 'Transferir' }));

    expect(await screen.findByText(/Transferencia realizada/)).toBeInTheDocument();
    expect(postedBody).toMatchObject({
      fromAccountId: 'acc1',
      toAccountId: 'acc1',
      fromCurrency: 'ARS',
      toCurrency: 'USD',
      fromAmount: 100000,
      toAmount: 95,
    });
  });

  it('misma cuenta + misma moneda: error inline y submit deshabilitado', async () => {
    stubEndpoints();
    renderPage();

    await selectOption('Cuenta origen', 'acc1', { exact: false });
    await selectOption('Cuenta destino', 'acc1', { exact: false });

    expect(
      await screen.findByText('Elegí cuentas distintas, o monedas distintas dentro de la misma cuenta.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Transferir' })).toBeDisabled();
  });

  it('lista: transfer intra-cuenta muestra la cuenta con sus dos monedas y ambos montos', async () => {
    const intra = {
      ...transfer,
      id: 'tr2',
      fromAccountId: 'acc1',
      toAccountId: 'acc1',
      fromCurrency: 'ARS',
      toCurrency: 'USD',
      fromAmount: 100000,
      toAmount: 95,
      exchangeRate: 0.00095,
    };
    stubEndpoints({
      transfersPage: { content: [intra], page: 0, size: 20, totalElements: 1, totalPages: 1 },
    });
    renderPage();

    expect(await screen.findByText('Banco ARS · ARS → USD')).toBeInTheDocument();
    expect(screen.getByText(/100\.000,00/)).toBeInTheDocument(); // ARS debitado
    expect(screen.getByText(/95,00/)).toBeInTheDocument();       // USD acreditado
  });

  it('borrar transferencia pide confirmación en un ConfirmDialog', async () => {
    stubEndpoints();
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Borrar' }));
    const dialog = screen.getByRole('dialog', { name: 'Borrar transferencia' });
    expect(within(dialog).getByText('Esta acción no se puede deshacer.')).toBeInTheDocument();
  });
});
