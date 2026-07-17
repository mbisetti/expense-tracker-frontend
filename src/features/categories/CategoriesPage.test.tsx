import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../auth/context';
import { CategoriesPage } from './CategoriesPage';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { jsonResponse } from '../../test/mockResponse';

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

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 'test-token', status: 'authenticated', setAccessToken: () => {} }}
      >
        <ToastProvider>
          <CategoriesPage />
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('CategoriesPage', () => {
  it('agrupa por tipo con subtítulo; la del sistema no tiene acciones, la del usuario tiene el lápiz', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => jsonResponse(200, [userCategory, systemCategory])),
    );

    renderPage();

    expect(await screen.findByText('Alimentación')).toBeInTheDocument();
    // subtítulo del grupo (ambas son EXPENSE)
    expect(screen.getByRole('heading', { name: 'Gasto' })).toBeInTheDocument();
    expect(screen.getByText('Sistema')).toBeInTheDocument();
    // solo la categoría del usuario tiene el menú de acciones (lápiz)
    expect(screen.getByRole('button', { name: 'Editar Mascotas' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Editar Alimentación' }),
    ).not.toBeInTheDocument();
  });

  it('403 CATEGORY_NOT_EDITABLE al borrar muestra un toast con mensaje claro', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, options?: RequestInit) => {
        if (options?.method === 'DELETE') {
          return jsonResponse(403, { error: 'CATEGORY_NOT_EDITABLE', message: 'system' });
        }
        return jsonResponse(200, [userCategory]);
      }),
    );

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Editar Mascotas' }));
    fireEvent.click(screen.getByRole('button', { name: 'Borrar' }));
    const dialog = screen.getByRole('dialog', { name: 'Borrar categoría' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Borrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Las categorías del sistema no se pueden modificar ni borrar.',
    );
  });

  it('cancelar el ConfirmDialog no borra la categoría', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, options?: RequestInit) => {
        if (options?.method === 'DELETE') throw new Error('no debería llamarse');
        return jsonResponse(200, [userCategory]);
      }),
    );

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Editar Mascotas' }));
    fireEvent.click(screen.getByRole('button', { name: 'Borrar' }));
    const dialog = screen.getByRole('dialog', { name: 'Borrar categoría' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Mascotas')).toBeInTheDocument();
  });
});
