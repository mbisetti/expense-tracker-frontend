import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../auth/context';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { RecurringExpenseForm } from './RecurringExpenseForm';
import { jsonResponse } from '../../test/mockResponse';
import { selectOption } from '../../test/selectOption';

const expenseCat = { id: 'c1', userId: 'u', name: 'Servicios', type: 'EXPENSE', color: null, icon: null, isEssential: false, sourceDefaultCategoryId: null, createdAt: '2026-01-01' };

let postCalls: { url: string; body: Record<string, unknown> }[];

beforeEach(() => {
  postCalls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, options?: RequestInit) => {
      if (options?.method === 'POST') {
        postCalls.push({ url, body: JSON.parse(options.body as string) });
        return jsonResponse(201, { id: 'rec-new' });
      }
      if (url.includes('/categories')) return jsonResponse(200, [expenseCat]);
      return jsonResponse(200, []);
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

function renderForm() {
  const onClose = vi.fn();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={{ accessToken: 't', status: 'authenticated', setAccessToken: () => {} }}>
        <ToastProvider>
          <RecurringExpenseForm open defaultCurrency="ARS" onClose={onClose} />
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
  return onClose;
}

describe('RecurringExpenseForm', () => {
  it('los campos de config cambian con la frecuencia', async () => {
    renderForm();
    // MONTHLY (default): día de cobro; sin día de semana ni mes
    expect(await screen.findByLabelText(/Día de cobro/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Día de la semana/)).not.toBeInTheDocument();

    await selectOption('Frecuencia', 'WEEKLY');
    expect(await screen.findByLabelText(/Día de la semana/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Día de cobro/)).not.toBeInTheDocument();

    await selectOption('Frecuencia', 'ANNUAL');
    expect(await screen.findByLabelText('Mes')).toBeInTheDocument();
    expect(screen.getByLabelText(/Día \(1-31\)/)).toBeInTheDocument();
  });

  it('las cuotas solo aparecen en mensual', async () => {
    renderForm();
    expect(await screen.findByRole('switch', { name: 'En cuotas' })).toBeInTheDocument();
    await selectOption('Frecuencia', 'WEEKLY');
    await waitFor(() => expect(screen.queryByRole('switch', { name: 'En cuotas' })).not.toBeInTheDocument());
  });

  it('crea un recurrente con la config de la frecuencia', async () => {
    const onClose = renderForm();
    fireEvent.change(await screen.findByLabelText(/Nombre/), { target: { value: 'Netflix' } });
    fireEvent.change(screen.getByLabelText(/Monto/), { target: { value: '5990' } });
    fireEvent.change(screen.getByLabelText(/Día de cobro/), { target: { value: '15' } });
    await selectOption('Categoría', 'c1', { exact: false });

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(postCalls).toHaveLength(1));
    expect(postCalls[0].url).toContain('/recurring-expenses');
    expect(postCalls[0].body).toMatchObject({
      name: 'Netflix', amount: 5990, currency: 'ARS', categoryId: 'c1', frequency: 'MONTHLY', billingDay: 15,
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
