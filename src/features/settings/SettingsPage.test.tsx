import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../auth/context';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { SettingsPage } from './SettingsPage';
import { jsonResponse } from '../../test/mockResponse';
import { selectOption, selectValue } from '../../test/selectOption';

function renderSettings() {
  const setAccessToken = vi.fn();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 'test-token', status: 'authenticated', setAccessToken }}
      >
        <ToastProvider>
          <MemoryRouter>
            <SettingsPage />
          </MemoryRouter>
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
  return { setAccessToken };
}

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe('SettingsPage', () => {
  it('muestra las preferencias y el sidebar; la cuenta se mudó a su propia página (S25.4)', () => {
    renderSettings();

    expect(screen.getByRole('heading', { name: 'Ajustes y preferencias' })).toBeInTheDocument();
    expect(screen.getByText('Tema')).toBeInTheDocument();
    expect(screen.getByLabelText('Formato de fecha', { exact: false })).toBeInTheDocument();
    expect(screen.getByLabelText('Calendario', { exact: false })).toBeInTheDocument();

    // D8: el sidebar con los subtítulos de cada sección.
    const sidebar = screen.getByRole('navigation', { name: 'Secciones de ajustes' });
    expect(within(sidebar).getByRole('button', { name: 'Preferencias' })).toBeInTheDocument();
    expect(within(sidebar).getByRole('button', { name: 'Instalar la app' })).toBeInTheDocument();
    expect(within(sidebar).getByRole('button', { name: 'Notificaciones' })).toBeInTheDocument();

    // D7: lo de la cuenta ya NO vive acá (borrado, email, Telegram → página Cuenta).
    expect(screen.queryByRole('button', { name: 'Borrar cuenta' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cambiar email' })).not.toBeInTheDocument();
    // Categorías/Métodos se mudaron a la página Datos (S21)
    expect(screen.queryByRole('link', { name: 'Categorías' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Métodos de pago' })).not.toBeInTheDocument();
  });

  it('moneda favorita: muestra la actual (server) y al cambiarla pega PATCH /users/me', async () => {
    const me = { id: 'u1', email: 'a@a.com', name: 'A', defaultCurrency: 'ARS', createdAt: '2026-01-01T00:00:00' };
    const patchBodies: Record<string, unknown>[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, opts?: RequestInit) => {
        if (opts?.method === 'PATCH') {
          const body = JSON.parse(opts.body as string);
          patchBodies.push(body);
          return jsonResponse(200, { ...me, defaultCurrency: body.defaultCurrency });
        }
        if (String(url).includes('/users/me')) return jsonResponse(200, me);
        return jsonResponse(200, {});
      }),
    );
    renderSettings();

    await waitFor(() => expect(selectValue('Moneda favorita', { exact: false })).toBe('ARS'));

    await selectOption('Moneda favorita', 'USD', { exact: false });
    await waitFor(() => expect(patchBodies).toContainEqual({ defaultCurrency: 'USD' }));
  });

  it('elegir formato de fecha yankee lo persiste en localStorage', async () => {
    renderSettings();

    await selectOption('Formato de fecha', 'us', { exact: false });
    expect(localStorage.getItem('dateFormat')).toBe('us');
  });

  it('elegir calendario US lo persiste en localStorage', async () => {
    renderSettings();

    await selectOption('Calendario', 'US', { exact: false });
    expect(localStorage.getItem('holidayCalendar')).toBe('US');
  });
});
