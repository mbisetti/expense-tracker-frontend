import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import { ForgotPasswordPage } from './ForgotPasswordPage';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { jsonResponse } from '../../test/mockResponse';

// S25.3 — pedir el link de reset. La pantalla de éxito dice siempre lo mismo (anti-enumeración).

const forgotReq: { body?: string } = {};

function renderPage() {
  const router = createMemoryRouter(
    [
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/login', element: <h1>Login</h1> },
    ],
    { initialEntries: ['/forgot-password'] },
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

function stubFetch(forgotStatus: number) {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/auth/refresh')) {
        return jsonResponse(401, { error: 'INVALID_REFRESH_TOKEN' });
      }
      if (url.includes('/auth/forgot-password')) {
        forgotReq.body = typeof init?.body === 'string' ? init.body : undefined;
        if (forgotStatus === 204) {
          return Promise.resolve(new Response(null, { status: 204 }));
        }
        return jsonResponse(forgotStatus, { error: 'RATE_LIMIT_EXCEEDED' });
      }
      return jsonResponse(200, {});
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  forgotReq.body = undefined;
});

describe('olvidé mi contraseña', () => {
  it('manda el email y muestra la pantalla de éxito constante', async () => {
    stubFetch(204);
    renderPage();

    // D5: el aviso de que el link solo llega a emails verificados está ANTES de mandar.
    expect(
      await screen.findByText(/llega solo si tu email está verificado/),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Email/), {
      target: { value: 'marko@test.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Mandar link' }));

    expect(await screen.findByRole('heading', { name: 'Revisá tu casilla' })).toBeInTheDocument();
    expect(
      screen.getByText(/a un email sin verificar no le mandamos links/i),
    ).toBeInTheDocument();
    expect(JSON.parse(forgotReq.body!)).toEqual({ email: 'marko@test.com' });
  });

  it('el rate limit muestra toast y deja el formulario en pie', async () => {
    stubFetch(429);
    renderPage();

    fireEvent.change(await screen.findByLabelText(/Email/), {
      target: { value: 'marko@test.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Mandar link' }));

    expect(await screen.findByText('Demasiados intentos. Esperá un momento.')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Restablecer contraseña' }),
    ).toBeInTheDocument();
  });
});
