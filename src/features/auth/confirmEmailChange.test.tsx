import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import { ConfirmEmailChangePage } from './ConfirmEmailChangePage';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { jsonResponse } from '../../test/mockResponse';

// S25.4 — la página del link de cambio de email (llega al email NUEVO).

const confirmReq: { body?: string; calls: number } = { calls: 0 };

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/confirm-email-change', element: <ConfirmEmailChangePage /> },
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

function stubFetch(status: number, errorCode = 'INVALID_VERIFICATION_TOKEN') {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/auth/refresh')) {
        return jsonResponse(401, { error: 'INVALID_REFRESH_TOKEN' });
      }
      if (url.includes('/auth/confirm-email-change')) {
        confirmReq.calls += 1;
        confirmReq.body = typeof init?.body === 'string' ? init.body : undefined;
        if (status === 204) return Promise.resolve(new Response(null, { status: 204 }));
        return jsonResponse(status, { error: errorCode });
      }
      return jsonResponse(200, {});
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  confirmReq.body = undefined;
  confirmReq.calls = 0;
});

describe('confirmación de cambio de email', () => {
  it('postea el token al montar y muestra el éxito', async () => {
    stubFetch(204);
    renderAt('/confirm-email-change?token=abc');

    expect(
      await screen.findByText('¡Listo! Tu email quedó actualizado y verificado.'),
    ).toBeInTheDocument();
    expect(confirmReq.calls).toBe(1);
    expect(JSON.parse(confirmReq.body!)).toEqual({ token: 'abc' });
  });

  it('si el email fue tomado mientras tanto, lo dice sin aplicar nada', async () => {
    stubFetch(409, 'EMAIL_ALREADY_EXISTS');
    renderAt('/confirm-email-change?token=tarde');

    expect(
      await screen.findByText('Ese email ya está en uso por otra cuenta. El cambio no se aplicó.'),
    ).toBeInTheDocument();
  });

  it('token quemado o vencido: mensaje de link muerto', async () => {
    stubFetch(400);
    renderAt('/confirm-email-change?token=viejo');

    expect(
      await screen.findByText('El link ya no sirve. Puede haber vencido o ya haberse usado.'),
    ).toBeInTheDocument();
  });

  it('sin token no postea nada', async () => {
    stubFetch(204);
    renderAt('/confirm-email-change');

    expect(await screen.findByText('El link no es válido.')).toBeInTheDocument();
    expect(confirmReq.calls).toBe(0);
  });
});
