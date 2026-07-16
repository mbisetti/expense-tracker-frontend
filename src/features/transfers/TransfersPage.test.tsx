import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../auth/context';
import { TransfersPage } from './TransfersPage';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { ok } from '../../test/mockResponse';

const accArs1 = { id: 'acc1', name: 'Banco ARS', type: 'DEBIT', currency: 'ARS', balance: 5000, createdAt: '2026-01-01T00:00:00' };
const accArs2 = { id: 'acc2', name: 'Ahorro ARS', type: 'DEBIT', currency: 'ARS', balance: 0, createdAt: '2026-01-01T00:00:00' };
const accUsd = { id: 'acc3', name: 'Dolares', type: 'DEBIT', currency: 'USD', balance: 100, createdAt: '2026-01-01T00:00:00' };

const transfer = {
  id: 'tr1',
  fromAccountId: 'acc1',
  toAccountId: 'acc2',
  fromAmount: 1500,
  toAmount: 1500,
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

  it('el destino excluye solo el origen (cross-currency habilitado)', async () => {
    stubEndpoints();
    renderPage();

    // Cuenta origen/destino son required: el label agrega un "*" (aria-hidden) → exact:false.
    fireEvent.change(await screen.findByLabelText('Cuenta origen', { exact: false }), {
      target: { value: 'acc1' },
    });

    const toSelect = screen.getByLabelText('Cuenta destino', { exact: false }) as HTMLSelectElement;
    const labels = Array.from(toSelect.options).map((o) => o.textContent ?? '');
    expect(labels.some((l) => l.includes('Ahorro ARS'))).toBe(true);   // otra ARS
    expect(labels.some((l) => l.includes('Dolares'))).toBe(true);      // USD ahora SÍ (cross-currency)
    expect(labels.some((l) => l.includes('Banco ARS'))).toBe(false);   // es el origen
  });

  it('cross-currency: aparece el segundo monto y la cotización sugerida', async () => {
    stubEndpoints();
    renderPage();

    fireEvent.change(await screen.findByLabelText('Cuenta origen', { exact: false }), {
      target: { value: 'acc1' },
    }); // ARS
    fireEvent.change(screen.getByLabelText('Cuenta destino', { exact: false }), {
      target: { value: 'acc3' },
    }); // USD

    // aparece el input de monto a acreditar en la moneda destino
    expect(await screen.findByLabelText(/Monto a acreditar \(USD\)/)).toBeInTheDocument();
    expect(await screen.findByText(/Cotización sugerida/)).toBeInTheDocument();
  });

  it('submit: manda POST con los datos y muestra un toast de éxito con ambos saldos', async () => {
    let postedBody: Record<string, unknown> | undefined;
    stubEndpoints({ onPost: (body) => { postedBody = body; } });
    renderPage();

    fireEvent.change(await screen.findByLabelText('Cuenta origen', { exact: false }), {
      target: { value: 'acc1' },
    });
    fireEvent.change(screen.getByLabelText('Cuenta destino', { exact: false }), {
      target: { value: 'acc2' },
    });
    fireEvent.change(screen.getByLabelText('Monto', { exact: false }), { target: { value: '1500' } });
    fireEvent.click(screen.getByRole('button', { name: 'Transferir' }));

    expect(await screen.findByText(/Transferencia realizada/)).toBeInTheDocument();
    // same-currency: fromAmount == toAmount
    expect(postedBody).toMatchObject({ fromAccountId: 'acc1', toAccountId: 'acc2', fromAmount: 1500, toAmount: 1500 });
    expect(postedBody?.date).toBeTruthy();
  });

  it('con menos de dos cuentas: muestra el mensaje y no el form', async () => {
    stubEndpoints({ accounts: [accArs1] });
    renderPage();

    expect(await screen.findByText('Necesitás al menos dos cuentas para transferir.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Cuenta origen', { exact: false })).not.toBeInTheDocument();
  });

  it('empty state de transferencias', async () => {
    stubEndpoints({ transfersPage: { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 } });
    renderPage();

    expect(await screen.findByText('Todavía no hiciste transferencias.')).toBeInTheDocument();
  });

  it('con ?to= en la URL, precarga la cuenta destino', async () => {
    stubEndpoints();
    renderPage(['/transfers?to=acc2']);

    const toSelect = (await screen.findByLabelText('Cuenta destino', {
      exact: false,
    })) as HTMLSelectElement;
    expect(toSelect.value).toBe('acc2');
  });

  it('borrar transferencia pide confirmación en un ConfirmDialog', async () => {
    stubEndpoints();
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Borrar' }));
    const dialog = screen.getByRole('dialog', { name: 'Borrar transferencia' });
    expect(within(dialog).getByText('Esta acción no se puede deshacer.')).toBeInTheDocument();
  });
});
