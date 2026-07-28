import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../auth/context';
import { TransactionsPage } from './TransactionsPage';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { jsonResponse } from '../../test/mockResponse';

const emptyPage = { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 };

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 'test-token', status: 'authenticated', setAccessToken: () => {} }}
      >
        <ToastProvider>
          <MemoryRouter>
            <TransactionsPage />
          </MemoryRouter>
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('TransactionsPage', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('/transactions')) return jsonResponse(200, emptyPage);
        return jsonResponse(200, []);
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('muestra el empty state cuando no hay transacciones', async () => {
    renderPage();
    expect(await screen.findByText('No hay transacciones para mostrar.')).toBeInTheDocument();
  });

  it('manda el Authorization header en el request', async () => {
    renderPage();
    await screen.findByText('No hay transacciones para mostrar.');
    const fetchMock = vi.mocked(fetch);
    const [, options] = fetchMock.mock.calls[0];
    expect((options?.headers as Record<string, string>).Authorization).toBe('Bearer test-token');
  });

  // Contrato del backend: DELETE /transactions/{id} responde 200 con
  // TransactionResponse completo (accountBalance recalculado), NO 204.
  it('borra con confirmación y maneja el 200-con-body del DELETE', async () => {
    const tx = {
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
    const account = {
      id: 'acc-1',
      name: 'Efectivo',
      type: 'CASH',
      currency: 'ARS',
      balance: 900,
      createdAt: '2026-07-01T00:00:00',
    };
    const oneItemPage = { content: [tx], page: 0, size: 20, totalElements: 1, totalPages: 1 };

    let deleted = false;
    const calls: { url: string; method?: string }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, options?: RequestInit) => {
        calls.push({ url, method: options?.method });
        if (options?.method === 'DELETE') {
          deleted = true;
          return jsonResponse(200, { ...tx, accountBalance: 1000 });
        }
        if (url.includes('/transactions'))
          return jsonResponse(200, deleted ? emptyPage : oneItemPage);
        if (url.includes('/accounts')) return jsonResponse(200, [account]);
        return jsonResponse(200, []);
      }),
    );

    renderPage();
    // El borrado salió de la fila: se llega por el lápiz → form de edición → Borrar.
    fireEvent.click(await screen.findByRole('button', { name: 'Editar movimiento' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Borrar' }));
    const dialog = screen.getByRole('dialog', { name: 'Borrar transacción' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Borrar' }));

    // La invalidación refetchea la lista: si el body del 200 no se parseara bien,
    // la mutación fallaría y aparecería el alert en lugar del empty state.
    expect(await screen.findByText('No hay transacciones para mostrar.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    const deleteCall = calls.find((c) => c.method === 'DELETE');
    expect(deleteCall?.url).toContain('/transactions/tx-1');
  });

  it('cancelar el ConfirmDialog no borra la transacción', async () => {
    const tx = {
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
    const oneItemPage = { content: [tx], page: 0, size: 20, totalElements: 1, totalPages: 1 };

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, options?: RequestInit) => {
        if (options?.method === 'DELETE') throw new Error('no debería llamarse');
        if (url.includes('/transactions')) return jsonResponse(200, oneItemPage);
        return jsonResponse(200, []);
      }),
    );

    renderPage();
    // El borrado salió de la fila: se llega por el lápiz → form de edición → Borrar.
    fireEvent.click(await screen.findByRole('button', { name: 'Editar movimiento' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Borrar' }));
    const dialog = screen.getByRole('dialog', { name: 'Borrar transacción' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Super')).toBeInTheDocument();
  });

  it('si el borrado falla, muestra un toast de error y no borra la fila', async () => {
    const tx = {
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
    const oneItemPage = { content: [tx], page: 0, size: 20, totalElements: 1, totalPages: 1 };

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, options?: RequestInit) => {
        if (options?.method === 'DELETE') {
          return jsonResponse(422, { error: 'TRANSACTION_NOT_FOUND', message: 'not found' });
        }
        if (url.includes('/transactions')) return jsonResponse(200, oneItemPage);
        return jsonResponse(200, []);
      }),
    );

    renderPage();
    // El borrado salió de la fila: se llega por el lápiz → form de edición → Borrar.
    fireEvent.click(await screen.findByRole('button', { name: 'Editar movimiento' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Borrar' }));
    const dialog = screen.getByRole('dialog', { name: 'Borrar transacción' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Borrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La transacción no existe o fue borrada.',
    );
    expect(screen.getByText('Super')).toBeInTheDocument();
  });

  // Sprint 24.4: badge "Auto" sólo en las tx generadas por el débito automático.
  it('muestra el badge Auto sólo en las transacciones autogeneradas', async () => {
    const base = {
      accountId: 'acc-1', categoryId: null, paymentMethodId: null, type: 'EXPENSE', amount: 100,
      currency: 'ARS', exchangeRateAtTime: null, createdAt: '2026-07-01T00:00:00', recurringExpenseId: null,
    };
    const autoTx = { ...base, id: 'tx-auto', date: '2026-07-02', description: 'Débito automático — Netflix', autoGenerated: true };
    const manualTx = { ...base, id: 'tx-manual', date: '2026-07-01', description: 'Super', autoGenerated: false };
    const page = { content: [autoTx, manualTx], page: 0, size: 20, totalElements: 2, totalPages: 1 };

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('/transactions')) return jsonResponse(200, page);
        return jsonResponse(200, []);
      }),
    );

    renderPage();
    // el badge Auto aparece una sola vez (la autogenerada)
    expect(await screen.findByText('Débito automático — Netflix')).toBeInTheDocument();
    expect(screen.getByText('Super')).toBeInTheDocument();
    expect(screen.getAllByText('Auto')).toHaveLength(1);
  });
});
