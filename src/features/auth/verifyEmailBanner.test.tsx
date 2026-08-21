import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from './context';
import { VerifyEmailBanner } from './VerifyEmailBanner';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { jsonResponse } from '../../test/mockResponse';

// S25.2 — el banner del header: existe solo con el email sin verificar, y Reenviar repite el
// mail con su toast.

const resendReq: { calls: number } = { calls: 0 };

function me(overrides: Record<string, unknown> = {}) {
  return {
    id: 'u1',
    email: 'marko@test.com',
    name: 'Marko',
    defaultCurrency: 'ARS',
    workingCurrencies: [],
    hasPassword: true,
    emailVerified: false,
    createdAt: '2026-01-01T00:00:00',
    ...overrides,
  };
}

function stubFetch(meBody: object) {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/users/me/verification-email') && init?.method === 'POST') {
        resendReq.calls += 1;
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      if (url.includes('/users/me')) {
        return jsonResponse(200, meBody);
      }
      return jsonResponse(200, {});
    }),
  );
}

function renderBanner() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 'test-token', status: 'authenticated', setAccessToken: vi.fn() }}
      >
        <ToastProvider>
          <MemoryRouter>
            <VerifyEmailBanner />
          </MemoryRouter>
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  resendReq.calls = 0;
});

describe('banner de verificación de email', () => {
  it('con el email sin verificar muestra el aviso con el email y el botón', async () => {
    stubFetch(me());
    renderBanner();

    expect(await screen.findByText(/Verificá tu email/)).toBeInTheDocument();
    expect(screen.getByText('marko@test.com')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reenviar' }));
    expect(await screen.findByText('Mail reenviado. Revisá tu casilla.')).toBeInTheDocument();
    expect(resendReq.calls).toBe(1);
  });

  it('verificado no renderiza nada', async () => {
    stubFetch(me({ emailVerified: true }));
    renderBanner();

    // Esperar el ciclo de la query y confirmar la ausencia.
    await Promise.resolve();
    expect(screen.queryByText(/Verificá tu email/)).toBeNull();
  });
});
