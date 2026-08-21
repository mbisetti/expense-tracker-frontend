import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import { VerifyEmailPage } from './VerifyEmailPage';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { jsonResponse } from '../../test/mockResponse';

// S25.2 — la página del link del mail: postea el token al montar y cuenta cómo salió.

const verifyReq: { body?: string; calls: number } = { calls: 0 };

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/verify-email', element: <VerifyEmailPage /> },
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

function stubFetch(verifyStatus: number, verifyBody?: object) {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/auth/refresh')) {
        return jsonResponse(401, { error: 'INVALID_REFRESH_TOKEN' });
      }
      if (url.includes('/auth/verify-email')) {
        verifyReq.calls += 1;
        verifyReq.body = typeof init?.body === 'string' ? init.body : undefined;
        if (verifyStatus === 204) {
          return Promise.resolve(new Response(null, { status: 204 }));
        }
        return jsonResponse(verifyStatus, verifyBody ?? { error: 'INVALID_VERIFICATION_TOKEN' });
      }
      return jsonResponse(200, {});
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  verifyReq.body = undefined;
  verifyReq.calls = 0;
});

describe('verificación de email', () => {
  it('postea el token del query param al montar y muestra el éxito', async () => {
    stubFetch(204);
    renderAt('/verify-email?token=abc123');

    expect(await screen.findByText('¡Listo! Tu email quedó verificado.')).toBeInTheDocument();
    expect(verifyReq.calls).toBe(1);
    expect(JSON.parse(verifyReq.body!)).toEqual({ token: 'abc123' });
  });

  it('un token quemado o vencido muestra el mensaje de link muerto', async () => {
    stubFetch(400);
    renderAt('/verify-email?token=viejo');

    expect(
      await screen.findByText('El link ya no sirve. Puede haber vencido o ya haberse usado.'),
    ).toBeInTheDocument();
  });

  it('sin token no postea nada y avisa que el link no es válido', async () => {
    stubFetch(204);
    renderAt('/verify-email');

    expect(
      await screen.findByText('El link ya no sirve. Puede haber vencido o ya haberse usado.'),
    ).toBeInTheDocument();
    expect(verifyReq.calls).toBe(0);
  });
});
