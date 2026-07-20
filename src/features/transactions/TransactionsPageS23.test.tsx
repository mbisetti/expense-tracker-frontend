import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../auth/context';
import { TransactionsPage } from './TransactionsPage';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { jsonResponse } from '../../test/mockResponse';

const emptyPage = { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 };

const accounts = [
  { id: 'a1', name: 'Efectivo', type: 'CASH', currency: 'ARS', balance: 1500, isInformal: false,
    statementCloseDay: null, paymentDueDay: null, balances: [{ currency: 'ARS', balance: 1500 }],
    createdAt: '2026-07-01T00:00:00', institution: null, linkedAccountId: null },
  { id: 'a2', name: 'Banco', type: 'BANK', currency: 'ARS', balance: 9000, isInformal: false,
    statementCloseDay: null, paymentDueDay: null, balances: [{ currency: 'ARS', balance: 9000 }],
    createdAt: '2026-07-01T00:00:00', institution: null, linkedAccountId: null },
];

const categories = [
  { id: 'c1', userId: null, name: 'Sueldo', type: 'INCOME', color: null, icon: null, sourceDefaultCategoryId: null, createdAt: '2026-07-01T00:00:00' },
  { id: 'c2', userId: null, name: 'Comida', type: 'EXPENSE', color: null, icon: null, sourceDefaultCategoryId: null, createdAt: '2026-07-01T00:00:00' },
  { id: 'c3', userId: null, name: 'Ajuste', type: 'BOTH', color: null, icon: null, sourceDefaultCategoryId: null, createdAt: '2026-07-01T00:00:00' },
];

let txRequests: string[];

beforeEach(() => {
  txRequests = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url.includes('/transactions')) {
        txRequests.push(url);
        return jsonResponse(200, emptyPage);
      }
      if (url.includes('/transfers')) return jsonResponse(200, emptyPage);
      if (url.includes('/categories')) return jsonResponse(200, categories);
      if (url.includes('/accounts')) return jsonResponse(200, accounts);
      return jsonResponse(200, []);
    }),
  );
});

afterEach(() => vi.unstubAllGlobals());

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
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

describe('TransactionsPage — chips de cuenta (Sprint 23 D9)', () => {
  it('renderiza un chip por cuenta con su saldo y togglea el filtro (sincronizado con el select)', async () => {
    renderPage();
    const group = await screen.findByRole('group', { name: 'Filtrar por cuenta' });
    const efectivo = within(group).getByRole('button', { name: /Efectivo/ });
    expect(efectivo).toHaveTextContent(/1\.500/); // saldo de la principal
    expect(efectivo).toHaveAttribute('aria-pressed', 'false');

    // click → filtra y sincroniza el select "Cuenta"
    fireEvent.click(efectivo);
    expect(efectivo).toHaveAttribute('aria-pressed', 'true');
    expect((screen.getByLabelText('Cuenta') as HTMLSelectElement).value).toBe('a1');

    // re-click → togglea a '' (sin filtro)
    fireEvent.click(efectivo);
    expect(efectivo).toHaveAttribute('aria-pressed', 'false');
    expect((screen.getByLabelText('Cuenta') as HTMLSelectElement).value).toBe('');
  });
});

describe('TransactionsPage — filtro de categoría (Sprint 23 D2)', () => {
  it('las opciones dependen del Tipo (BOTH sirve para ambos)', async () => {
    renderPage();
    const category = (await screen.findByLabelText('Categoría')) as HTMLSelectElement;
    // esperar a que carguen las categorías (las opciones aparecen tras el fetch)
    await within(category).findByRole('option', { name: 'Sueldo' });
    // Tipo vacío → todas
    expect(within(category).getByRole('option', { name: 'Sueldo' })).toBeInTheDocument();
    expect(within(category).getByRole('option', { name: 'Comida' })).toBeInTheDocument();
    expect(within(category).getByRole('option', { name: 'Ajuste' })).toBeInTheDocument();

    // Tipo INCOME → Sueldo + Ajuste, sin Comida
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'INCOME' } });
    expect(within(category).getByRole('option', { name: 'Sueldo' })).toBeInTheDocument();
    expect(within(category).getByRole('option', { name: 'Ajuste' })).toBeInTheDocument();
    expect(within(category).queryByRole('option', { name: 'Comida' })).not.toBeInTheDocument();
  });

  it('con Tipo "Entre cuentas" el filtro de categoría se deshabilita', async () => {
    renderPage();
    await screen.findByLabelText('Categoría');
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'TRANSFER' } });
    expect(screen.getByLabelText('Categoría')).toBeDisabled();
  });

  it('cambiar a un Tipo incompatible resetea la categoría elegida', async () => {
    renderPage();
    const category = (await screen.findByLabelText('Categoría')) as HTMLSelectElement;
    await within(category).findByRole('option', { name: 'Comida' });
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'EXPENSE' } });
    fireEvent.change(category, { target: { value: 'c2' } }); // Comida (EXPENSE)
    expect(category.value).toBe('c2');

    // pasar a INCOME → Comida no aplica → reset a ''
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'INCOME' } });
    expect(category.value).toBe('');
  });

  it('la categoría viaja server-side en el request de transacciones', async () => {
    renderPage();
    const category = (await screen.findByLabelText('Categoría')) as HTMLSelectElement;
    await within(category).findByRole('option', { name: 'Sueldo' });
    fireEvent.change(category, { target: { value: 'c1' } });
    await waitFor(() => expect(txRequests.some((u) => u.includes('categoryId=c1'))).toBe(true));
  });
});
