import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../auth/context';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { DataPage } from './DataPage';
import { jsonResponse } from '../../test/mockResponse';

// Sprint 26: la página suma la sección Exportación, que consulta cuentas → necesita los
// providers (antes alcanzaba con el router).
function renderData() {
  vi.stubGlobal('fetch', vi.fn(() => jsonResponse(200, [])));
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 'test-token', status: 'authenticated', setAccessToken: vi.fn() }}
      >
        <ToastProvider>
          <MemoryRouter>
            <DataPage />
          </MemoryRouter>
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('DataPage', () => {
  it('muestra accesos a categorías y métodos de pago', () => {
    renderData();

    expect(screen.getByRole('heading', { name: 'Datos' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Categorías' })).toHaveAttribute('href', '/categories');
    expect(screen.getByRole('link', { name: 'Métodos de pago' })).toHaveAttribute(
      'href',
      '/payment-methods',
    );
  });

  it('muestra la sección de exportación', () => {
    renderData();

    expect(screen.getByRole('heading', { name: 'Exportación' })).toBeInTheDocument();
    expect(screen.getByLabelText('Qué exportar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exportar' })).toBeInTheDocument();
    // El selector de cuenta sólo aparece con "Movimientos por cuenta".
    expect(screen.queryByLabelText('Cuenta')).not.toBeInTheDocument();
  });
});
