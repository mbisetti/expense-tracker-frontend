import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../auth/context';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { RecurringDetailModal } from './RecurringDetailModal';
import { jsonResponse } from '../../test/mockResponse';
import type { RecurringExpense, RecurringItem } from './api';

const installmentsRec: RecurringExpense = {
  id: 'rec1', name: 'Heladera', amount: 1000, currency: 'ARS', categoryId: 'c1', frequency: 'MONTHLY',
  billingDay: 5, weekday: null, dueMonth: null, installmentsTotal: 12, cashPrice: 10000, active: true,
  createdAt: '2026-01-01T00:00:00',
};
const item: RecurringItem = {
  id: 'rec1', name: 'Heladera', amount: 1000, frequency: 'MONTHLY', billingDay: 5, weekday: null,
  dueMonth: null, state: 'PENDING', expectedCount: 1, paidCount: 0, installmentsPaid: 6,
  installmentsTotal: 12, cashPrice: 10000, isEssential: false, categoryId: 'c1', categoryName: 'Cuotas',
};

const historyTx = {
  id: 't1', accountId: 'a', categoryId: null, paymentMethodId: null, type: 'EXPENSE', amount: 1000,
  currency: 'ARS', exchangeRateAtTime: null, date: '2026-06-05', description: 'Cuota 6',
  createdAt: '2026-06-05T00:00:00', recurringExpenseId: 'rec1',
};

let deleteCalls: string[];

beforeEach(() => {
  deleteCalls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, options?: RequestInit) => {
      if (options?.method === 'DELETE') {
        deleteCalls.push(url);
        return jsonResponse(200, {});
      }
      if (url.includes('/transactions')) {
        return jsonResponse(200, { content: [historyTx], page: 0, size: 100, totalElements: 6, totalPages: 1 });
      }
      if (url.includes('/categories')) {
        return jsonResponse(200, [{ id: 'c1', userId: 'u', name: 'Cuotas', type: 'EXPENSE', color: null, icon: null, isEssential: false, sourceDefaultCategoryId: null, createdAt: '2026-01-01' }]);
      }
      return jsonResponse(200, []);
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

function renderDetail(recurring: RecurringExpense) {
  const onClose = vi.fn();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={{ accessToken: 't', status: 'authenticated', setAccessToken: () => {} }}>
        <ToastProvider>
          <RecurringDetailModal recurring={recurring} item={item} onClose={onClose} onEdit={() => {}} />
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
  return onClose;
}

describe('RecurringDetailModal', () => {
  it('muestra el costo del financiamiento con precio de contado', async () => {
    renderDetail(installmentsRec);
    // total en cuotas 12*1000 = 12000 vs contado 10000 → +2000 (+20%)
    expect(await screen.findByText(/Total en cuotas/)).toBeInTheDocument();
    expect(screen.getByText(/vs contado/)).toBeInTheDocument();
    expect(screen.getByText(/\+20%/)).toBeInTheDocument();
  });

  it('sin precio de contado no muestra el financiamiento', async () => {
    renderDetail({ ...installmentsRec, cashPrice: null });
    await screen.findByText('Historial de pagos');
    expect(screen.queryByText(/Total en cuotas/)).not.toBeInTheDocument();
  });

  it('renderiza el historial de pagos vinculados', async () => {
    renderDetail(installmentsRec);
    expect(await screen.findByText('Cuota 6')).toBeInTheDocument();
  });

  it('borrar pide confirmación y luego llama al DELETE', async () => {
    renderDetail(installmentsRec);
    fireEvent.click(await screen.findByRole('button', { name: 'Borrar' }));
    // el ConfirmDialog explica que se desvincula la historia
    expect(await screen.findByText(/se desvincula/)).toBeInTheDocument();
    // confirmar
    const confirm = screen.getAllByRole('button', { name: 'Borrar' }).at(-1)!;
    fireEvent.click(confirm);
    await waitFor(() => expect(deleteCalls).toHaveLength(1));
    expect(deleteCalls[0]).toContain('/recurring-expenses/rec1');
  });
});
