import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../auth/context';
import { TransferForm } from './TransferForm';
import { ToastProvider } from '../../components/ui/ToastProvider';
import type { TransferListItem } from './api';
import { jsonResponse } from '../../test/mockResponse';
import { selectOption, selectValue } from '../../test/selectOption';

const accA = {
  id: 'a', name: 'Caja ARS', type: 'BANK', currency: 'ARS', balance: 5000, isInformal: false,
  statementCloseDay: null, paymentDueDay: null, balances: [{ currency: 'ARS', balance: 5000 }],
  createdAt: '2026-07-01T00:00:00', institution: null, linkedAccountId: null,
};
const accB = {
  id: 'b', name: 'Banco ARS', type: 'BANK', currency: 'ARS', balance: 0, isInformal: false,
  statementCloseDay: null, paymentDueDay: null, balances: [{ currency: 'ARS', balance: 0 }],
  createdAt: '2026-07-01T00:00:00', institution: null, linkedAccountId: null,
};
const accUsd = {
  id: 'u', name: 'Dólares', type: 'BANK', currency: 'USD', balance: 0, isInformal: false,
  statementCloseDay: null, paymentDueDay: null, balances: [{ currency: 'USD', balance: 0 }],
  createdAt: '2026-07-01T00:00:00', institution: null, linkedAccountId: null,
};

const editTransfer: TransferListItem = {
  id: 't1', fromAccountId: 'a', toAccountId: 'b', fromAmount: 500, toAmount: 500,
  fromCurrency: 'ARS', toCurrency: 'ARS', fee: null, exchangeRate: 1, date: '2026-07-10',
  description: 'Alquiler', fromTransactionId: 'ft', toTransactionId: 'tt',
  createdAt: '2026-07-10T00:00:00',
};

let calls: { url: string; method?: string; body?: Record<string, unknown> }[];

beforeEach(() => {
  calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, options?: RequestInit) => {
      const method = options?.method;
      const body = options?.body ? JSON.parse(options.body as string) : undefined;
      calls.push({ url, method, body });
      if (method === 'PUT' || method === 'POST') {
        return jsonResponse(method === 'PUT' ? 200 : 201, {
          ...editTransfer, ...body, id: 'new', fromAccountBalance: 100, toAccountBalance: 900,
        });
      }
      if (url.includes('/exchange-rates')) {
        return jsonResponse(200, { base: 'ARS', target: 'USD', rate: null, asOf: null, unavailable: true });
      }
      if (url.includes('/accounts')) return jsonResponse(200, [accA, accB, accUsd]);
      return jsonResponse(200, []);
    }),
  );
});

afterEach(() => vi.unstubAllGlobals());

function renderForm(props: Parameters<typeof TransferForm>[0] = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 'test-token', status: 'authenticated', setAccessToken: () => {} }}
      >
        <ToastProvider>
          <TransferForm {...props} />
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('TransferForm en edición (Sprint 23 D4)', () => {
  it('prefill + PUT al endpoint con el shape correcto, y llama onDone', async () => {
    const onDone = vi.fn();
    renderForm({ transfer: editTransfer, onDone });

    // título y botón de edición (el botón sólo tras cargar las cuentas)
    expect(await screen.findByText('Editar transferencia')).toBeInTheDocument();
    const save = await screen.findByRole('button', { name: 'Guardar' });

    // prefill de cuentas (labels con asterisco de required → exact:false)
    await waitFor(() => expect(selectValue('Cuenta origen', { exact: false })).toBe('a'));
    expect(selectValue('Cuenta destino', { exact: false })).toBe('b');

    // cambiar el monto y guardar
    fireEvent.change(screen.getByLabelText(/Monto/), { target: { value: '800' } });
    fireEvent.click(save);

    await waitFor(() => expect(calls.some((c) => c.method === 'PUT')).toBe(true));
    const put = calls.find((c) => c.method === 'PUT')!;
    expect(put.url).toContain('/transfers/t1');
    expect(put.body).toMatchObject({
      fromAccountId: 'a', toAccountId: 'b', fromAmount: 800, toAmount: 800,
      fromCurrency: 'ARS', toCurrency: 'ARS', date: '2026-07-10',
    });
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it('Cancelar cierra sin mutar', async () => {
    const onDone = vi.fn();
    renderForm({ transfer: editTransfer, onDone });
    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));
    expect(onDone).toHaveBeenCalled();
    expect(calls.some((c) => c.method === 'PUT')).toBe(false);
  });
});

describe('TransferForm en alta — layout D5/D6 cross-currency', () => {
  it('alta cross-currency: fila debitar → acreditar y POST con ambos montos', async () => {
    renderForm();

    // selectOption espera a que carguen las cuentas y la opción exista
    await selectOption('Cuenta origen', 'a', { exact: false });
    await selectOption('Cuenta destino', 'u', { exact: false });

    // aparecen los dos montos (la fila con flecha)
    fireEvent.change(await screen.findByLabelText(/Monto a debitar/), { target: { value: '1000' } });
    fireEvent.change(screen.getByLabelText(/Monto a acreditar/), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Transferir' }));

    await waitFor(() => expect(calls.some((c) => c.method === 'POST')).toBe(true));
    const post = calls.find((c) => c.method === 'POST')!;
    expect(post.url).toContain('/transfers');
    expect(post.body).toMatchObject({
      fromAccountId: 'a', toAccountId: 'u', fromAmount: 1000, toAmount: 10,
      fromCurrency: 'ARS', toCurrency: 'USD',
    });
  });
});
