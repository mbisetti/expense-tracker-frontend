import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../auth/context';
import { CategoriesPage } from './CategoriesPage';

const userCategory = {
  id: 'cat-1',
  userId: 'user-1',
  name: 'Mascotas',
  type: 'EXPENSE',
  color: '#aa3bff',
  icon: null,
  sourceDefaultCategoryId: null,
  createdAt: '2026-07-01T00:00:00',
};

const systemCategory = {
  id: 'cat-sys',
  userId: null,
  name: 'Alimentación',
  type: 'EXPENSE',
  color: '#00ff00',
  icon: null,
  sourceDefaultCategoryId: null,
  createdAt: '2026-07-01T00:00:00',
};

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 'test-token', status: 'authenticated', setAccessToken: () => {} }}
      >
        <CategoriesPage />
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('CategoriesPage', () => {
  it('las categorías del sistema no muestran acciones de edición', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(jsonResponse(200, [userCategory, systemCategory]))),
    );

    renderPage();

    expect(await screen.findByText('Alimentación')).toBeInTheDocument();
    expect(screen.getByText('Sistema')).toBeInTheDocument();
    // Solo la categoría del usuario tiene botones
    expect(screen.getAllByRole('button', { name: 'Editar' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Borrar' })).toHaveLength(1);
  });

  it('403 CATEGORY_NOT_EDITABLE al borrar muestra mensaje claro', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, options?: RequestInit) => {
        if (options?.method === 'DELETE') {
          return Promise.resolve(
            jsonResponse(403, { error: 'CATEGORY_NOT_EDITABLE', message: 'system' }),
          );
        }
        return Promise.resolve(jsonResponse(200, [userCategory]));
      }),
    );

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Borrar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sí' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Las categorías del sistema no se pueden modificar ni borrar.',
    );
  });
});
