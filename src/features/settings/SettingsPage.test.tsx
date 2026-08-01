import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

  // ── S7: borrar la cuenta exige reautenticación ─────────────────────────────
  //
  // Este test antes confirmaba y borraba de una. Cambió porque cambió el contrato, no para
  // que pasara: el token dice "alguien entró alguna vez" y esto es irreversible.

  const meWithPassword = {
    id: 'u1', email: 'a@a.com', name: 'A', defaultCurrency: 'ARS',
    hasPassword: true, createdAt: '2026-01-01T00:00:00',
  };

  it('borrar cuenta: manda la contraseña, pega a DELETE /users/me y limpia la sesión', async () => {
    // Distingue por MÉTODO, no por URL: GET /users/me (el perfil) y DELETE /users/me son el
    // mismo path y tienen que contestar distinto.
    const fetchMock = vi.fn((_url: unknown, init?: RequestInit) =>
      init?.method === 'DELETE' ? jsonResponse(204) : jsonResponse(200, meWithPassword),
    );
    vi.stubGlobal('fetch', fetchMock);
    const { setAccessToken } = renderSettings();

    fireEvent.click(screen.getByRole('button', { name: 'Borrar cuenta' }));
    const dialog = screen.getByRole('dialog', { name: 'Borrar cuenta' });

    fireEvent.change(await within(dialog).findByLabelText(/Confirmá tu contraseña/i), {
      target: { value: 'mi-password' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Borrar cuenta' }));

    await waitFor(() => expect(setAccessToken).toHaveBeenCalledWith(null));
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/users/me'),
      expect.objectContaining({ method: 'DELETE', body: JSON.stringify({ password: 'mi-password' }) }),
    );
  });

  // El caso que motivó S7: sin la contraseña no se puede ni intentar.
  it('borrar cuenta: sin contraseña el botón de confirmar está deshabilitado', async () => {
    vi.stubGlobal('fetch', vi.fn(() => jsonResponse(200, meWithPassword)));
    renderSettings();

    fireEvent.click(screen.getByRole('button', { name: 'Borrar cuenta' }));
    const dialog = screen.getByRole('dialog', { name: 'Borrar cuenta' });

    expect(within(dialog).getByRole('button', { name: 'Borrar cuenta' })).toBeDisabled();
  });

  // Un 401 REAUTH_REQUIRED NO es sesión vencida: el usuario sigue adentro y el diálogo queda
  // abierto para reintentar. Desloguearlo por un typo sería el peor final posible.
  it('borrar cuenta: si la contraseña no coincide, no cierra la sesión', async () => {
    const fetchMock = vi.fn((_url: unknown, init?: RequestInit) =>
      init?.method === 'DELETE'
        ? jsonResponse(401, { error: 'REAUTH_REQUIRED', message: 'Password does not match' })
        : jsonResponse(200, meWithPassword),
    );
    vi.stubGlobal('fetch', fetchMock);
    const { setAccessToken } = renderSettings();

    fireEvent.click(screen.getByRole('button', { name: 'Borrar cuenta' }));
    const dialog = screen.getByRole('dialog', { name: 'Borrar cuenta' });
    fireEvent.change(await within(dialog).findByLabelText(/Confirmá tu contraseña/i), {
      target: { value: 'la-que-no-es' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Borrar cuenta' }));

    await screen.findByText(/no coincide/i);
    expect(setAccessToken).not.toHaveBeenCalledWith(null);
    expect(screen.getByRole('dialog', { name: 'Borrar cuenta' })).toBeInTheDocument();
  });

  // Google-only: no tiene contraseña que escribir, así que ni se le muestra el campo.
  it('borrar cuenta: un usuario de Google ve confirmación con Google, no un campo de contraseña', async () => {
    vi.stubGlobal('fetch', vi.fn(() => jsonResponse(200, { ...meWithPassword, hasPassword: false })));
    renderSettings();

    fireEvent.click(screen.getByRole('button', { name: 'Borrar cuenta' }));
    const dialog = await screen.findByRole('dialog', { name: 'Borrar cuenta' });

    await within(dialog).findByRole('button', { name: 'Confirmar con Google' });
    expect(within(dialog).queryByLabelText(/Confirmá tu contraseña/i)).toBeNull();
  });
});
