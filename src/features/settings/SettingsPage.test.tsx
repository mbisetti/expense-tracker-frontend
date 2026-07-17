import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../auth/context';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { SettingsPage } from './SettingsPage';
import { jsonResponse } from '../../test/mockResponse';

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
  it('muestra tema, formato de fecha, calendario y borrar cuenta', () => {
    renderSettings();

    expect(screen.getByRole('heading', { name: 'Ajustes y preferencias' })).toBeInTheDocument();
    expect(screen.getByText('Tema')).toBeInTheDocument();
    expect(screen.getByLabelText('Formato de fecha', { exact: false })).toBeInTheDocument();
    expect(screen.getByLabelText('Calendario', { exact: false })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Borrar cuenta' })).toBeInTheDocument();
    // Categorías/Métodos se mudaron a la página Datos
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

    const select = (await screen.findByLabelText('Moneda favorita', { exact: false })) as HTMLSelectElement;
    await waitFor(() => expect(select.value).toBe('ARS'));

    fireEvent.change(select, { target: { value: 'USD' } });
    await waitFor(() => expect(patchBodies).toContainEqual({ defaultCurrency: 'USD' }));
  });

  it('elegir formato de fecha yankee lo persiste en localStorage', () => {
    renderSettings();

    fireEvent.change(screen.getByLabelText('Formato de fecha', { exact: false }), {
      target: { value: 'us' },
    });
    expect(localStorage.getItem('dateFormat')).toBe('us');
  });

  it('elegir calendario US lo persiste en localStorage', () => {
    renderSettings();

    fireEvent.change(screen.getByLabelText('Calendario', { exact: false }), {
      target: { value: 'US' },
    });
    expect(localStorage.getItem('holidayCalendar')).toBe('US');
  });

  it('borrar cuenta: confirma, pega a DELETE /users/me y limpia la sesión', async () => {
    const fetchMock = vi.fn(() => jsonResponse(204));
    vi.stubGlobal('fetch', fetchMock);
    const { setAccessToken } = renderSettings();

    fireEvent.click(screen.getByRole('button', { name: 'Borrar cuenta' }));
    const dialog = screen.getByRole('dialog', { name: 'Borrar cuenta' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Borrar cuenta' }));

    await waitFor(() => expect(setAccessToken).toHaveBeenCalledWith(null));
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/users/me'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
