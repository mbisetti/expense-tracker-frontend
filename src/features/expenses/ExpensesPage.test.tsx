import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../auth/context';
import { ExpensesPage } from './ExpensesPage';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { jsonResponse } from '../../test/mockResponse';
import type { CurrencyExpenses } from './api';

function months(nonEssential: number): CurrencyExpenses['months'] {
  return ['2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07'].map((m, i) => ({
    month: m,
    essential: 0,
    nonEssential: i === 5 ? nonEssential : 0,
  }));
}

const arsCurrency: CurrencyExpenses = {
  currency: 'ARS',
  total: 900,
  essentialTotal: 300,
  nonEssentialTotal: 600,
  prevMonthTotal: 600,
  avg3mTotal: 500,
  totalToDate: null,
  projectedTotal: null,
  byCategory: [
    { categoryId: 'c1', name: 'Ocio', color: '#ff0000', isEssential: false, amount: 500, prevMonthAmount: 400, avg3mAmount: 300, txCount: 3, avg3mCount: 3, maxTxAmount: 200 },
    { categoryId: 'c2', name: 'Vivienda', color: '#00ff00', isEssential: true, amount: 300, prevMonthAmount: 300, avg3mAmount: 300, txCount: 1, avg3mCount: 1, maxTxAmount: 300 },
    { categoryId: null, name: null, color: null, isEssential: false, amount: 100, prevMonthAmount: 0, avg3mAmount: 0, txCount: 2, avg3mCount: 0, maxTxAmount: 60 },
  ],
  months: months(600),
};

const usdCurrency: CurrencyExpenses = {
  currency: 'USD',
  total: 40,
  essentialTotal: 0,
  nonEssentialTotal: 40,
  prevMonthTotal: 0,
  avg3mTotal: 0,
  totalToDate: null,
  projectedTotal: null,
  byCategory: [
    { categoryId: 'c3', name: 'Viajes', color: '#0000ff', isEssential: false, amount: 40, prevMonthAmount: 0, avg3mAmount: 0, txCount: 1, avg3mCount: 0, maxTxAmount: 40 },
  ],
  months: months(40),
};

let byCurrency: CurrencyExpenses[];

beforeEach(() => {
  byCurrency = [arsCurrency];
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url.includes('/summary/expenses')) {
        return jsonResponse(200, { year: 2026, month: 7, byCurrency });
      }
      if (url.includes('/users/me')) {
        return jsonResponse(200, { id: 'u', email: 'a@a.com', name: 'A', defaultCurrency: 'ARS' });
      }
      if (url.includes('/categories')) return jsonResponse(200, []);
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
          <ExpensesPage />
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('ExpensesPage', () => {
  it('renderiza las secciones con una moneda', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Gastos' })).toBeInTheDocument();
    // desglose + insights (Ocio y "Sin categoría" aparecen en ambos → getAllByText)
    expect((await screen.findAllByText('Ocio')).length).toBeGreaterThan(0);
    expect(screen.getByText('Vivienda')).toBeInTheDocument(); // esencial → solo en el desglose
    expect(screen.getAllByText('Sin categoría').length).toBeGreaterThan(0);
    // insights
    expect(screen.getByRole('heading', { name: 'Dónde recortar' })).toBeInTheDocument();
    expect(screen.getByText(/Recortando 20% de lo no esencial/)).toBeInTheDocument();
  });

  it('EmptyState cuando no hay gastos en el período', async () => {
    byCurrency = [];
    renderPage();
    expect(await screen.findByText('No hay gastos en este período.')).toBeInTheDocument();
  });

  it('con dos monedas muestra los tabs y cambia el análisis al elegir otra', async () => {
    byCurrency = [arsCurrency, usdCurrency];
    renderPage();

    // default = defaultCurrency ARS → muestra Ocio; USD todavía no
    expect((await screen.findAllByText('Ocio')).length).toBeGreaterThan(0);
    expect(screen.queryByText('Viajes')).not.toBeInTheDocument();

    // click en el tab USD → muestra la categoría USD y desaparece la ARS
    fireEvent.click(screen.getByRole('tab', { name: 'USD' }));
    expect((await screen.findAllByText('Viajes')).length).toBeGreaterThan(0);
    expect(screen.queryAllByText('Ocio')).toHaveLength(0);
  });
});
