import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../auth/context';
import { CategoryForm } from './CategoryForm';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { jsonResponse } from '../../test/mockResponse';
import type { Category } from './api';

const editCat: Category = {
  id: 'cat-1',
  userId: 'u',
  name: 'Ocio',
  type: 'EXPENSE',
  color: '#aa3bff',
  icon: null,
  isEssential: false,
  sourceDefaultCategoryId: null,
  createdAt: '2026-07-01T00:00:00',
};

let calls: { url: string; method?: string; body?: Record<string, unknown> }[];

beforeEach(() => {
  calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, options?: RequestInit) => {
      calls.push({
        url,
        method: options?.method,
        body: options?.body ? JSON.parse(options.body as string) : undefined,
      });
      return jsonResponse(options?.method === 'POST' ? 201 : 200, { ...editCat });
    }),
  );
});

afterEach(() => vi.unstubAllGlobals());

function renderForm(category?: Category) {
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
          <CategoryForm category={category} onClose={onClose} />
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
  return onClose;
}

describe('CategoryForm — esencialidad (Sprint 24)', () => {
  it('el switch "Esencial" se muestra en gasto y se oculta en INCOME', () => {
    renderForm();
    expect(screen.getByRole('switch', { name: 'Esencial' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'INCOME' } });
    expect(screen.queryByRole('switch', { name: 'Esencial' })).not.toBeInTheDocument();
  });

  it('en edición, el flag entra al PATCH solo si cambió', async () => {
    const onClose = renderForm(editCat);
    fireEvent.click(screen.getByRole('switch', { name: 'Esencial' })); // false → true
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(calls.some((c) => c.method === 'PATCH')).toBe(true));
    const patch = calls.find((c) => c.method === 'PATCH')!;
    expect(patch.url).toContain('/categories/cat-1');
    expect(patch.body).toEqual({ isEssential: true });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('en edición sin tocar el switch, el PATCH no incluye isEssential', async () => {
    const onClose = renderForm(editCat);
    // cambia solo el nombre (label required lleva asterisco → exact:false)
    fireEvent.change(screen.getByLabelText('Nombre', { exact: false }), {
      target: { value: 'Ocio y salidas' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(calls.some((c) => c.method === 'PATCH')).toBe(true));
    const patch = calls.find((c) => c.method === 'PATCH')!;
    expect(patch.body).toEqual({ name: 'Ocio y salidas' });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
