import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../auth/context';
import { TransactionForm } from './TransactionForm';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { jsonResponse } from '../../test/mockResponse';
import { openSelect, selectOption } from '../../test/selectOption';
import type { TransactionListItem } from './api';

const account = {
  id: 'acc-1', name: 'Efectivo', type: 'CASH', currency: 'ARS', balance: 100000, isInformal: false,
  statementCloseDay: null, paymentDueDay: null, balances: [{ currency: 'ARS', balance: 100000 }],
  createdAt: '2026-07-01T00:00:00',
};
const recArs = {
  id: 'r1', name: 'Alquiler', amount: 50000, currency: 'ARS', categoryId: 'c1', frequency: 'MONTHLY',
  billingDay: 1, weekday: null, dueMonth: null, installmentsTotal: null, cashPrice: null, active: true,
  createdAt: '2026-01-01T00:00:00',
};
const recUsd = { ...recArs, id: 'r2', name: 'Netflix USD', currency: 'USD' };
const expenseCat = { id: 'c1', userId: 'u', name: 'Vivienda', type: 'EXPENSE', color: null, icon: null, isEssential: true, sourceDefaultCategoryId: null, createdAt: '2026-01-01' };

let postCalls: { url: string; body: Record<string, unknown> }[];
let patchCalls: { url: string; body: Record<string, unknown> }[];
let failTxPost = false;

beforeEach(() => {
  postCalls = [];
  patchCalls = [];
  failTxPost = false;
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, options?: RequestInit) => {
      if (options?.method === 'POST') {
        const body = JSON.parse(options.body as string);
        postCalls.push({ url, body });
        if (url.includes('/recurring-expenses')) return jsonResponse(201, { id: 'rec-new', ...body });
        if (failTxPost) return jsonResponse(400, { error: 'INSUFFICIENT_BALANCE' });
        return jsonResponse(201, { ...body, id: 'tx-new', accountBalance: 50000 });
      }
      if (options?.method === 'PATCH') {
        const body = JSON.parse(options.body as string);
        patchCalls.push({ url, body });
        return jsonResponse(200, { id: 'tx-1', accountBalance: 900 });
      }
      if (url.includes('/recurring-expenses')) return jsonResponse(200, [recArs, recUsd]);
      if (url.includes('/accounts')) return jsonResponse(200, [account]);
      if (url.includes('/categories')) return jsonResponse(200, [expenseCat]);
      return jsonResponse(200, []);
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

function renderForm(transaction?: TransactionListItem) {
  const onClose = vi.fn();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={{ accessToken: 't', status: 'authenticated', setAccessToken: () => {} }}>
        <ToastProvider>
          <TransactionForm transaction={transaction} onClose={onClose} />
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
  return onClose;
}

describe('TransactionForm — vínculo recurrente', () => {
  it('el checkbox solo aparece en gastos', async () => {
    renderForm();
    expect(await screen.findByRole('switch', { name: 'Gasto recurrente' })).toBeInTheDocument();
    await selectOption('Tipo', 'INCOME');
    await waitFor(() => expect(screen.queryByRole('switch', { name: 'Gasto recurrente' })).not.toBeInTheDocument());
  });

  it('el select "¿Cuál?" filtra por la moneda de la tx y prefillea al elegir', async () => {
    renderForm();
    await selectOption('Cuenta', 'acc-1', { exact: false }); // ARS
    fireEvent.click(await screen.findByRole('switch', { name: 'Gasto recurrente' }));

    const listbox = await openSelect('¿Cuál?');
    expect(within(listbox).getByText('Alquiler')).toBeInTheDocument();
    expect(within(listbox).queryByText('Netflix USD')).not.toBeInTheDocument();

    // elegir la opción directamente del listbox abierto (openSelect no lo cierra)
    fireEvent.click(within(listbox).getByText('Alquiler'));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(postCalls).toHaveLength(1));
    expect(postCalls[0].url).toContain('/transactions');
    expect(postCalls[0].body.recurringExpenseId).toBe('r1');
  });

  it('"+ Nuevo" hace las dos llamadas en orden (recurrente → tx vinculada)', async () => {
    renderForm();
    await selectOption('Cuenta', 'acc-1', { exact: false });
    fireEvent.change(screen.getByLabelText(/Monto/), { target: { value: '6000' } });
    await selectOption('Categoría', 'c1');
    fireEvent.click(await screen.findByRole('switch', { name: 'Gasto recurrente' }));
    await selectOption('¿Cuál?', '__new_recurring__');
    fireEvent.change(await screen.findByLabelText('Nombre del gasto recurrente'), { target: { value: 'Netflix' } });
    fireEvent.change(screen.getByLabelText(/Día de cobro/), { target: { value: '5' } });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(postCalls).toHaveLength(2));
    expect(postCalls[0].url).toContain('/recurring-expenses');
    expect(postCalls[1].url).toContain('/transactions');
    expect(postCalls[1].body.recurringExpenseId).toBe('rec-new');
  });

  it('si la 2ª llamada falla, el recurrente queda y avisa (form no cierra)', async () => {
    failTxPost = true;
    const onClose = renderForm();
    await selectOption('Cuenta', 'acc-1', { exact: false });
    fireEvent.change(screen.getByLabelText(/Monto/), { target: { value: '6000' } });
    await selectOption('Categoría', 'c1');
    fireEvent.click(await screen.findByRole('switch', { name: 'Gasto recurrente' }));
    await selectOption('¿Cuál?', '__new_recurring__');
    fireEvent.change(await screen.findByLabelText('Nombre del gasto recurrente'), { target: { value: 'Netflix' } });
    fireEvent.change(screen.getByLabelText(/Día de cobro/), { target: { value: '5' } });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    // ambas llamadas ocurrieron; el recurrente se creó, la tx falló
    await waitFor(() => expect(postCalls).toHaveLength(2));
    expect(await screen.findByText(/El gasto recurrente se creó/)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('en edición, destildar desvincula (PATCH con "")', async () => {
    const linkedTx: TransactionListItem = {
      id: 'tx-1', accountId: 'acc-1', categoryId: 'c1', paymentMethodId: null, type: 'EXPENSE',
      amount: 100, currency: 'ARS', exchangeRateAtTime: null, date: '2026-07-01', description: 'Super',
      createdAt: '2026-07-01T00:00:00', recurringExpenseId: 'r1', autoGenerated: false,
    };
    renderForm(linkedTx);
    const sw = await screen.findByRole('switch', { name: 'Gasto recurrente' });
    expect(sw).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(sw); // destildar

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(patchCalls).toHaveLength(1));
    expect(patchCalls[0].body).toEqual({ recurringExpenseId: '' });
  });
});
