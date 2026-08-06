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

// S40 (D4): las quick actions de la card de cuenta abren este mismo form prellenado. "Agregar
// plata" apunta el destino (ya existía); "Retirar" y "Registrar pago" necesitan apuntar el
// ORIGEN, que es lo que agrega initialFromAccountId.
describe('TransferForm prellenado desde la card de cuenta (S40 D4)', () => {
  it('initialFromAccountId prellena el origen', async () => {
    renderForm({ initialFromAccountId: 'a' });

    await waitFor(() => expect(selectValue('Cuenta origen', { exact: false })).toBe('a'));
    expect(selectValue('Cuenta destino', { exact: false })).toBe('');
  });

  it('initialToAccountId sigue prellenando el destino, y los dos conviven', async () => {
    renderForm({ initialFromAccountId: 'a', initialToAccountId: 'b' });

    await waitFor(() => expect(selectValue('Cuenta origen', { exact: false })).toBe('a'));
    expect(selectValue('Cuenta destino', { exact: false })).toBe('b');
  });

  it('en edición manda el transfer, no los prefills', async () => {
    renderForm({ transfer: editTransfer, initialFromAccountId: 'u' });

    await waitFor(() => expect(selectValue('Cuenta origen', { exact: false })).toBe('a'));
  });
});

// ── S41: comisión del destino ────────────────────────────────────────────────
describe('TransferForm — comisión del destino', () => {
  it('manda fee en el POST y no toca los montos de las patas', async () => {
    renderForm();
    await selectOption('Cuenta origen', 'a', { exact: false });
    await selectOption('Cuenta destino', 'b', { exact: false });

    fireEvent.change(screen.getByLabelText(/^Monto/), { target: { value: '10000' } });
    fireEvent.change(screen.getByLabelText(/^Comisión del destino/), { target: { value: '200' } });
    fireEvent.click(screen.getByRole('button', { name: 'Transferir' }));

    await waitFor(() => expect(calls.some((c) => c.method === 'POST')).toBe(true));
    const post = calls.find((c) => c.method === 'POST')!;
    // la comisión viaja aparte: las dos patas siguen en 10.000 (el invariante del backend)
    expect(post.body).toMatchObject({ fromAmount: 10000, toAmount: 10000, fee: 200 });
  });

  it('en modo % manda el MONTO calculado sobre lo que entra, no el porcentaje', async () => {
    renderForm();
    await selectOption('Cuenta origen', 'a', { exact: false });
    await selectOption('Cuenta destino', 'b', { exact: false });

    fireEvent.change(screen.getByLabelText(/^Monto/), { target: { value: '10000' } });
    fireEvent.click(screen.getByRole('tab', { name: '%' }));
    fireEvent.change(screen.getByLabelText(/^Comisión del destino \(%\)/), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Transferir' }));

    await waitFor(() => expect(calls.some((c) => c.method === 'POST')).toBe(true));
    expect(calls.find((c) => c.method === 'POST')!.body).toMatchObject({ fee: 200 });
  });

  it('sin comisión no manda el campo', async () => {
    renderForm();
    await selectOption('Cuenta origen', 'a', { exact: false });
    await selectOption('Cuenta destino', 'b', { exact: false });

    fireEvent.change(screen.getByLabelText(/^Monto/), { target: { value: '10000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Transferir' }));

    await waitFor(() => expect(calls.some((c) => c.method === 'POST')).toBe(true));
    expect(calls.find((c) => c.method === 'POST')!.body).not.toHaveProperty('fee');
  });

  it('una comisión que se come todo lo que entra frena el submit', async () => {
    renderForm();
    await selectOption('Cuenta origen', 'a', { exact: false });
    await selectOption('Cuenta destino', 'b', { exact: false });

    fireEvent.change(screen.getByLabelText(/^Monto/), { target: { value: '10000' } });
    fireEvent.change(screen.getByLabelText(/^Comisión del destino/), { target: { value: '10000' } });

    expect(await screen.findByText(/No puede ser mayor a lo que entra/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Transferir' })).toBeDisabled();
    expect(calls.some((c) => c.method === 'POST')).toBe(false);
  });
});
