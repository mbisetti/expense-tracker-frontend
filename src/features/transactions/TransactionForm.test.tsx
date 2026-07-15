import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../auth/context';
import { TransactionForm } from './TransactionForm';
import { ToastProvider } from '../../components/ui/ToastProvider';
import type { TransactionListItem } from './api';
import { jsonResponse } from '../../test/mockResponse';

const account = {
  id: 'acc-1',
  name: 'Efectivo',
  type: 'CASH',
  currency: 'ARS',
  balance: 1000,
  createdAt: '2026-07-01T00:00:00',
};

const editTx: TransactionListItem = {
  id: 'tx-1',
  accountId: 'acc-1',
  categoryId: null,
  paymentMethodId: null,
  type: 'EXPENSE',
  amount: 100,
  currency: 'ARS',
  exchangeRateAtTime: null,
  date: '2026-07-01',
  description: 'Super',
  createdAt: '2026-07-01T00:00:00',
};

let patchCalls: { url: string; body: Record<string, unknown> }[];
let patchResponse: { status: number; body: unknown };

beforeEach(() => {
  patchCalls = [];
  patchResponse = { status: 200, body: { ...editTx, accountBalance: 900 } };
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, options?: RequestInit) => {
      if (options?.method === 'PATCH') {
        patchCalls.push({ url, body: JSON.parse(options.body as string) });
        return jsonResponse(patchResponse.status, patchResponse.body);
      }
      if (url.includes('/accounts')) return jsonResponse(200, [account]);
      return jsonResponse(200, []);
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderEditForm() {
  const onClose = vi.fn();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 'test-token', status: 'authenticated', setAccessToken: () => {} }}
      >
        <ToastProvider>
          <TransactionForm transaction={editTx} onClose={onClose} />
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
  return onClose;
}

describe('TransactionForm en edición', () => {
  it('manda solo los campos modificados en el PATCH (diff-PATCH, 7-3)', async () => {
    const onClose = renderEditForm();

    fireEvent.change(screen.getByLabelText(/Monto/), { target: { value: '150' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(patchCalls).toHaveLength(1));
    expect(patchCalls[0].url).toContain('/transactions/tx-1');
    expect(patchCalls[0].body).toEqual({ amount: 150 });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('sin cambios: no hace ningún request y cierra el formulario', async () => {
    const onClose = renderEditForm();

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(patchCalls).toHaveLength(0);
  });

  it('422 INSUFFICIENT_BALANCE: muestra mensaje claro y no cierra', async () => {
    patchResponse = {
      status: 422,
      body: { error: 'INSUFFICIENT_BALANCE', message: 'Insufficient balance' },
    };
    const onClose = renderEditForm();

    fireEvent.change(screen.getByLabelText(/Monto/), { target: { value: '99999' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Saldo insuficiente en la cuenta para este gasto.',
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it('vaciar la descripción no la manda en el PATCH (limitación 7-4 documentada)', async () => {
    const onClose = renderEditForm();

    fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText(/Monto/), { target: { value: '150' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(patchCalls).toHaveLength(1));
    expect(patchCalls[0].body).toEqual({ amount: 150 });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
