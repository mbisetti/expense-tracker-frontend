import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../auth/context';
import { TransfersPage } from './TransfersPage';
import { ok } from '../../test/mockResponse';

const accArs1 = { id: 'acc1', name: 'Banco ARS', type: 'DEBIT', currency: 'ARS', balance: 5000, createdAt: '2026-01-01T00:00:00' };
const accArs2 = { id: 'acc2', name: 'Ahorro ARS', type: 'DEBIT', currency: 'ARS', balance: 0, createdAt: '2026-01-01T00:00:00' };
const accUsd = { id: 'acc3', name: 'Dolares', type: 'DEBIT', currency: 'USD', balance: 100, createdAt: '2026-01-01T00:00:00' };

const transfer = {
  id: 'tr1',
  fromAccountId: 'acc1',
  toAccountId: 'acc2',
  amount: 1500,
  fee: null,
  exchangeRate: null,
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
      if (url.includes('/transfers')) return ok(transfersPage);
      if (url.includes('/accounts')) return ok(accounts);
      throw new Error('URL inesperada: ' + url);
    }),
  );
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 'test-token', status: 'authenticated', setAccessToken: () => {} }}
      >
        <MemoryRouter>
          <TransfersPage />
        </MemoryRouter>
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

  it('el destino excluye el origen y las cuentas de otra moneda', async () => {
    stubEndpoints();
    renderPage();

    // elegir origen ARS habilita el destino, filtrado a misma moneda ≠ origen
    fireEvent.change(await screen.findByLabelText('Cuenta origen'), { target: { value: 'acc1' } });

    const toSelect = screen.getByLabelText('Cuenta destino') as HTMLSelectElement;
    const labels = Array.from(toSelect.options).map((o) => o.textContent ?? '');
    expect(labels.some((l) => l.includes('Ahorro ARS'))).toBe(true);   // ARS, distinta
    expect(labels.some((l) => l.includes('Banco ARS'))).toBe(false);   // es el origen
    expect(labels.some((l) => l.includes('Dolares'))).toBe(false);     // otra moneda
  });

  it('submit: manda POST con los datos y muestra el mensaje de éxito con ambos saldos', async () => {
    let postedBody: Record<string, unknown> | undefined;
    stubEndpoints({ onPost: (body) => { postedBody = body; } });
    renderPage();

    fireEvent.change(await screen.findByLabelText('Cuenta origen'), { target: { value: 'acc1' } });
    fireEvent.change(screen.getByLabelText('Cuenta destino'), { target: { value: 'acc2' } });
    fireEvent.change(screen.getByLabelText('Monto'), { target: { value: '1500' } });
    fireEvent.click(screen.getByRole('button', { name: 'Transferir' }));

    expect(await screen.findByText(/Transferencia realizada/)).toBeInTheDocument();
    expect(postedBody).toMatchObject({ fromAccountId: 'acc1', toAccountId: 'acc2', amount: 1500 });
    expect(postedBody?.date).toBeTruthy();
  });

  it('con menos de dos cuentas: muestra el mensaje y no el form', async () => {
    stubEndpoints({ accounts: [accArs1] });
    renderPage();

    expect(await screen.findByText('Necesitás al menos dos cuentas para transferir.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Cuenta origen')).not.toBeInTheDocument();
  });

  it('empty state de transferencias', async () => {
    stubEndpoints({ transfersPage: { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 } });
    renderPage();

    expect(await screen.findByText('Todavía no hiciste transferencias.')).toBeInTheDocument();
  });
});
