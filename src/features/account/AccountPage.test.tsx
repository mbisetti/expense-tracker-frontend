import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../auth/context';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { AccountPage } from './AccountPage';
import { jsonResponse } from '../../test/mockResponse';

// S25.4 — la página Cuenta: datos (nombre, email, contraseña), conectores y borrado (los tests
// del borrado se MUDARON acá desde SettingsPage.test, porque se mudó la sección).

const ME = {
  id: 'u1',
  email: 'marko@test.com',
  name: 'Marko',
  defaultCurrency: 'ARS',
  workingCurrencies: [],
  hasPassword: true,
  googleLinked: true,
  emailVerified: true,
  createdAt: '2026-01-01T00:00:00',
};

type Captured = { url: string; method?: string; body?: string };
const captured: Captured[] = [];

function stubFetch(me: object, responder?: (url: string, init?: RequestInit) => Response | null) {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      captured.push({
        url,
        method: init?.method,
        body: typeof init?.body === 'string' ? init.body : undefined,
      });
      const custom = responder?.(url, init);
      if (custom) return Promise.resolve(custom);
      if (url.includes('/telegram/status')) {
        // Sin bot configurado → TelegramSection se oculta y no mete ruido acá.
        return jsonResponse(200, { linked: false, botUsername: '', code: null, codeExpiresAt: null });
      }
      if (url.includes('/users/me') && (!init?.method || init.method === 'GET')) {
        return jsonResponse(200, me);
      }
      return jsonResponse(200, me);
    }),
  );
}

function renderAccount() {
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
            <AccountPage />
          </MemoryRouter>
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
  return { setAccessToken };
}

afterEach(() => {
  vi.unstubAllGlobals();
  captured.length = 0;
});

describe('AccountPage', () => {
  it('muestra nombre, email, contraseña, el conector de Google y el borrado', async () => {
    stubFetch(ME);
    renderAccount();

    expect(screen.getByRole('heading', { name: 'Cuenta' })).toBeInTheDocument();
    expect(await screen.findByText('Marko')).toBeInTheDocument();
    expect(screen.getByText('marko@test.com')).toBeInTheDocument();
    expect(screen.getByText('Verificado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cambiar contraseña' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cambiar email' })).toBeInTheDocument();
    expect(screen.getByText('Conectado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Borrar cuenta' })).toBeInTheDocument();
  });

  it('editar el nombre pega PATCH /users/me con el nombre nuevo', async () => {
    stubFetch(ME);
    renderAccount();

    fireEvent.click(await screen.findByRole('button', { name: 'Editar' }));
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Marko Bisetti' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Nombre actualizado.')).toBeInTheDocument();
    const patch = captured.find((c) => c.method === 'PATCH');
    expect(patch).toBeDefined();
    expect(JSON.parse(patch!.body!)).toEqual({ name: 'Marko Bisetti' });
  });

  it('cambiar contraseña manda PUT con la actual y la nueva, y avisa que cerró las otras sesiones', async () => {
    stubFetch(ME, (_url, init) =>
      init?.method === 'PUT' ? new Response(null, { status: 204 }) : null,
    );
    renderAccount();

    // El botón está disabled hasta que carga el perfil.
    await screen.findByText('marko@test.com');
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));
    const dialog = screen.getByRole('dialog', { name: 'Cambiar contraseña' });
    fireEvent.change(within(dialog).getByLabelText(/Contraseña actual/), {
      target: { value: 'vieja12345' },
    });
    fireEvent.change(within(dialog).getByLabelText(/Contraseña nueva/), {
      target: { value: 'nueva12345' },
    });
    fireEvent.change(within(dialog).getByLabelText(/Repetila/), {
      target: { value: 'nueva12345' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar contraseña' }));

    expect(
      await screen.findByText('Contraseña guardada. Cerramos tus otras sesiones.'),
    ).toBeInTheDocument();
    const putReq = captured.find((c) => c.method === 'PUT');
    expect(putReq!.url).toContain('/users/me/password');
    expect(JSON.parse(putReq!.body!)).toEqual({
      currentPassword: 'vieja12345',
      newPassword: 'nueva12345',
    });
  });

  it('contraseñas que no coinciden: toast local y NINGÚN request', async () => {
    stubFetch(ME);
    renderAccount();

    // El botón está disabled hasta que carga el perfil.
    await screen.findByText('marko@test.com');
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));
    const dialog = screen.getByRole('dialog', { name: 'Cambiar contraseña' });
    fireEvent.change(within(dialog).getByLabelText(/Contraseña actual/), {
      target: { value: 'vieja12345' },
    });
    fireEvent.change(within(dialog).getByLabelText(/Contraseña nueva/), {
      target: { value: 'nueva12345' },
    });
    fireEvent.change(within(dialog).getByLabelText(/Repetila/), {
      target: { value: 'distinta9999' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar contraseña' }));

    expect(await screen.findByText('Las contraseñas no coinciden.')).toBeInTheDocument();
    expect(captured.find((c) => c.method === 'PUT')).toBeUndefined();
  });

  it('solo-Google: ofrece Crear contraseña con el visto de Google y sin campo de contraseña actual', async () => {
    stubFetch({ ...ME, hasPassword: false });
    renderAccount();

    expect(await screen.findByText('Sin contraseña: entrás con Google')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Crear contraseña' }));
    const dialog = screen.getByRole('dialog', { name: 'Crear contraseña' });

    expect(within(dialog).queryByLabelText(/Contraseña actual/)).toBeNull();
    expect(within(dialog).getByRole('button', { name: 'Continuar con Google' })).toBeInTheDocument();
  });

  it('cambiar email manda el pedido y avisa que el mail va al email nuevo', async () => {
    stubFetch(ME, (url, init) =>
      url.includes('/email-change') && init?.method === 'POST'
        ? new Response(null, { status: 204 })
        : null,
    );
    renderAccount();

    fireEvent.click(await screen.findByRole('button', { name: 'Cambiar email' }));
    const dialog = screen.getByRole('dialog', { name: 'Cambiar email' });
    fireEvent.change(within(dialog).getByLabelText(/Email nuevo/), {
      target: { value: 'nuevo@test.com' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Mandar confirmación' }));

    expect(
      await screen.findByText('Te mandamos un mail a nuevo@test.com para confirmar el cambio.'),
    ).toBeInTheDocument();
    const req = captured.find((c) => c.url.includes('/email-change'));
    expect(JSON.parse(req!.body!)).toEqual({ newEmail: 'nuevo@test.com' });
  });

  // ── S7: borrar la cuenta (mudado desde SettingsPage.test con la sección) ────

  it('borrar cuenta: manda la contraseña, pega a DELETE /users/me y limpia la sesión', async () => {
    stubFetch(ME, (_url, init) =>
      init?.method === 'DELETE' ? new Response(null, { status: 204 }) : null,
    );
    const { setAccessToken } = renderAccount();

    fireEvent.click(await screen.findByRole('button', { name: 'Borrar cuenta' }));
    const dialog = screen.getByRole('dialog', { name: 'Borrar cuenta' });

    fireEvent.change(await within(dialog).findByLabelText(/Confirmá tu contraseña/i), {
      target: { value: 'mi-password' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Borrar cuenta' }));

    await waitFor(() => expect(setAccessToken).toHaveBeenCalledWith(null));
    const del = captured.find((c) => c.method === 'DELETE');
    expect(del!.body).toBe(JSON.stringify({ password: 'mi-password' }));
  });

  it('borrar cuenta: sin contraseña el botón de confirmar está deshabilitado', async () => {
    stubFetch(ME);
    renderAccount();

    fireEvent.click(await screen.findByRole('button', { name: 'Borrar cuenta' }));
    const dialog = screen.getByRole('dialog', { name: 'Borrar cuenta' });

    expect(within(dialog).getByRole('button', { name: 'Borrar cuenta' })).toBeDisabled();
  });

  it('borrar cuenta: si la contraseña no coincide, no cierra la sesión', async () => {
    stubFetch(ME, (_url, init) =>
      init?.method === 'DELETE'
        ? new Response(
            JSON.stringify({ error: 'REAUTH_REQUIRED', message: 'Password does not match' }),
            { status: 401, headers: { 'Content-Type': 'application/json' } },
          )
        : null,
    );
    const { setAccessToken } = renderAccount();

    fireEvent.click(await screen.findByRole('button', { name: 'Borrar cuenta' }));
    const dialog = screen.getByRole('dialog', { name: 'Borrar cuenta' });
    fireEvent.change(await within(dialog).findByLabelText(/Confirmá tu contraseña/i), {
      target: { value: 'la-que-no-es' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Borrar cuenta' }));

    await screen.findByText(/no coincide/i);
    expect(setAccessToken).not.toHaveBeenCalledWith(null);
    expect(screen.getByRole('dialog', { name: 'Borrar cuenta' })).toBeInTheDocument();
  });

  it('borrar cuenta: un usuario de Google ve confirmación con Google, no un campo de contraseña', async () => {
    stubFetch({ ...ME, hasPassword: false });
    renderAccount();

    fireEvent.click(await screen.findByRole('button', { name: 'Borrar cuenta' }));
    const dialog = await screen.findByRole('dialog', { name: 'Borrar cuenta' });

    await within(dialog).findByRole('button', { name: 'Confirmar con Google' });
    expect(within(dialog).queryByLabelText(/Confirmá tu contraseña/i)).toBeNull();
  });
});
