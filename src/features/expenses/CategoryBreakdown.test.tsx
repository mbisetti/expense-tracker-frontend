import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../auth/context';
import { CategoryBreakdown } from './CategoryBreakdown';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { jsonResponse } from '../../test/mockResponse';
import type { CurrencyExpenses } from './api';

const data: CurrencyExpenses = {
  currency: 'ARS',
  total: 900,
  essentialTotal: 300,
  nonEssentialTotal: 600,
  prevMonthTotal: 600,
  avg3mTotal: 500,
  byCategory: [
    { categoryId: 'c1', name: 'Ocio', color: '#ff0000', isEssential: false, amount: 500, prevMonthAmount: 400, avg3mAmount: 300 },
    { categoryId: 'c2', name: 'Vivienda', color: '#00ff00', isEssential: true, amount: 300, prevMonthAmount: 300, avg3mAmount: 300 },
    { categoryId: null, name: null, color: null, isEssential: false, amount: 100, prevMonthAmount: 0, avg3mAmount: 0 },
  ],
  months: [],
};

// Solo Ocio (c1) es del usuario → toggleable. Vivienda (c2) no está en useCategories.
const userCategories = [
  { id: 'c1', userId: 'u', name: 'Ocio', type: 'EXPENSE', color: '#ff0000', icon: null, isEssential: false, sourceDefaultCategoryId: null, createdAt: '2026-07-01T00:00:00' },
];

let patchCalls: { url: string; body: Record<string, unknown> }[];

beforeEach(() => {
  patchCalls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, options?: RequestInit) => {
      if (options?.method === 'PATCH') {
        patchCalls.push({ url, body: JSON.parse(options.body as string) });
        return jsonResponse(200, { ...userCategories[0], isEssential: true });
      }
      if (url.includes('/categories')) return jsonResponse(200, userCategories);
      return jsonResponse(200, []);
    }),
  );
});

afterEach(() => vi.unstubAllGlobals());

function renderBreakdown(onDrill = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 'test-token', status: 'authenticated', setAccessToken: () => {} }}
      >
        <ToastProvider>
          <CategoryBreakdown data={data} onDrill={onDrill} />
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
  return onDrill;
}

describe('CategoryBreakdown', () => {
  it('lista en orden desc con su % del total', () => {
    renderBreakdown();
    const items = screen.getAllByRole('listitem');
    expect(within(items[0]).getByText('Ocio')).toBeInTheDocument();
    expect(within(items[0]).getByText('56%')).toBeInTheDocument(); // 500/900
    expect(within(items[1]).getByText('Vivienda')).toBeInTheDocument();
    expect(within(items[2]).getByText('Sin categoría')).toBeInTheDocument();
  });

  it('el toggle solo aparece para categorías del usuario', async () => {
    renderBreakdown();
    // Ocio (c1) tiene switch; Vivienda (c2, no está en useCategories) y "Sin categoría" no
    expect(await screen.findByRole('switch', { name: /Marcar Ocio como esencial/ })).toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: /Vivienda/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: /Sin categoría/ })).not.toBeInTheDocument();
  });

  it('el toggle PATCHea { isEssential } sin toast de éxito', async () => {
    renderBreakdown();
    fireEvent.click(await screen.findByRole('switch', { name: /Marcar Ocio como esencial/ }));

    await waitFor(() => expect(patchCalls).toHaveLength(1));
    expect(patchCalls[0].url).toContain('/categories/c1');
    expect(patchCalls[0].body).toEqual({ isEssential: true });
    // sin toast de éxito (el feedback es visual): no aparece ningún alert
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('click en una categoría con id dispara el drill-down; "Sin categoría" no', () => {
    const onDrill = renderBreakdown();
    fireEvent.click(screen.getByRole('button', { name: 'Ocio' }));
    expect(onDrill).toHaveBeenCalledWith(expect.objectContaining({ categoryId: 'c1', name: 'Ocio' }));
    // "Sin categoría" no es un botón (no drill)
    expect(screen.queryByRole('button', { name: 'Sin categoría' })).not.toBeInTheDocument();
  });
});
