import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import { ResetPasswordPage } from './ResetPasswordPage';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { jsonResponse } from '../../test/mockResponse';

// S25.3 — consumir el link del reset. El éxito manda a /login (el server cerró todas las
// sesiones, D3) y el token quemado muestra su mensaje sin navegar.

const resetReq: { body?: string; calls: number } = { calls: 0 };

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/reset-password', element: <ResetPasswordPage /> },
      { path: '/forgot-password', element: <h1>Pedir link</h1> },
      { path: '/login', element: <h1>Login</h1> },
    ],
    { initialEntries: [path] },
  );
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

function stubFetch(resetStatus: number, errorCode = 'INVALID_RESET_TOKEN') {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/auth/refresh')) {
        return jsonResponse(401, { error: 'INVALID_REFRESH_TOKEN' });
      }
      if (url.includes('/auth/reset-password')) {
        resetReq.calls += 1;
        resetReq.body = typeof init?.body === 'string' ? init.body : undefined;
        if (resetStatus === 204) {
          return Promise.resolve(new Response(null, { status: 204 }));
        }
        return jsonResponse(resetStatus, { error: errorCode });
      }
      return jsonResponse(200, {});
    }),
  );
}

function fillAndSubmit(password: string, confirm: string) {
  // Regex y no string exacto: el label de un Input required termina en " *".
  fireEvent.change(screen.getByLabelText(/Contraseña nueva/), { target: { value: password } });
  fireEvent.change(screen.getByLabelText(/Repetila/), { target: { value: confirm } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  resetReq.body = undefined;
  resetReq.calls = 0;
});

describe('reset de contraseña', () => {
  it('con éxito postea el token y manda a /login con su toast', async () => {
    stubFetch(204);
    renderAt('/reset-password?token=tok1');

    await screen.findByRole('heading', { name: 'Elegí una contraseña nueva' });
    fillAndSubmit('nueva12345', 'nueva12345');

    expect(await screen.findByRole('heading', { name: 'Login' })).toBeInTheDocument();
    expect(
      await screen.findByText('Contraseña actualizada. Iniciá sesión de nuevo.'),
    ).toBeInTheDocument();
    expect(JSON.parse(resetReq.body!)).toEqual({ token: 'tok1', newPassword: 'nueva12345' });
  });

  it('contraseñas distintas: toast local y NINGÚN request', async () => {
    stubFetch(204);
    renderAt('/reset-password?token=tok1');

    await screen.findByRole('heading', { name: 'Elegí una contraseña nueva' });
    fillAndSubmit('nueva12345', 'otra12345');

    expect(await screen.findByText('Las contraseñas no coinciden.')).toBeInTheDocument();
    expect(resetReq.calls).toBe(0);
  });

  it('token quemado: toast del link muerto y sigue en la página', async () => {
    stubFetch(400);
    renderAt('/reset-password?token=viejo');

    await screen.findByRole('heading', { name: 'Elegí una contraseña nueva' });
    fillAndSubmit('nueva12345', 'nueva12345');

    expect(
      await screen.findByText('El link ya no sirve. Pedí uno nuevo desde "Restablecer contraseña".'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Elegí una contraseña nueva' }),
    ).toBeInTheDocument();
  });

  it('sin token en la URL ofrece pedir un link nuevo', async () => {
    stubFetch(204);
    renderAt('/reset-password');

    expect(await screen.findByText('El link no es válido.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pedir un link nuevo' })).toBeInTheDocument();
  });
});
