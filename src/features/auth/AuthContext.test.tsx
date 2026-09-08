import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider, UNAVAILABLE_RETRY_MS } from './AuthContext';
import { AuthContext } from './context';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuth } from './useAuth';
import { jsonResponse } from '../../test/mockResponse';

function Probe() {
  const { status } = useAuth();
  return <span data-testid="status">{status}</span>;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('AuthProvider (refresh del arranque)', () => {
  it('con cookie válida queda autenticado', async () => {
    vi.stubGlobal('fetch', vi.fn(() => jsonResponse(200, { accessToken: 'tok' })));

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    expect(await screen.findByText('authenticated')).toBeInTheDocument();
  });

  it('con un 401 del refresh queda sin sesión', async () => {
    vi.stubGlobal('fetch', vi.fn(() => jsonResponse(401, { error: 'INVALID_REFRESH_TOKEN' })));

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    expect(await screen.findByText('unauthenticated')).toBeInTheDocument();
  });

  // Red caída o deploy en curso: no es "sin sesión". Queda en 'unavailable' y se reintenta solo.
  it('si el server no contesta queda en unavailable y se recupera al reintentar', async () => {
    vi.useFakeTimers();
    let calls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        calls++;
        // 1 intento + 3 reintentos fallan → unavailable; el reintento de los 10 s trae el token
        return calls <= 4
          ? Promise.reject(new TypeError('Failed to fetch'))
          : jsonResponse(200, { accessToken: 'tok' });
      }),
    );

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(7_000);
    });
    expect(screen.getByTestId('status')).toHaveTextContent('unavailable');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(UNAVAILABLE_RETRY_MS);
    });
    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    expect(calls).toBe(5);
  });

  it('cuando vuelve la conexión reintenta sin esperar el timer', async () => {
    vi.useFakeTimers();
    let calls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        calls++;
        return calls <= 4
          ? Promise.reject(new TypeError('Failed to fetch'))
          : jsonResponse(200, { accessToken: 'tok' });
      }),
    );

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(7_000);
    });
    expect(screen.getByTestId('status')).toHaveTextContent('unavailable');

    await act(async () => {
      window.dispatchEvent(new Event('online'));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
  });
});

describe('ProtectedRoute', () => {
  it('con status unavailable muestra que está reintentando en vez de mandar al login', () => {
    render(
      <AuthContext.Provider value={{ accessToken: null, status: 'unavailable', setAccessToken: () => {} }}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<div>adentro</div>} />
            </Route>
            <Route path="/login" element={<div>login</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(screen.getByRole('status')).toHaveTextContent('No pudimos conectar con el servidor.');
    expect(screen.queryByText('login')).not.toBeInTheDocument();
    expect(screen.queryByText('adentro')).not.toBeInTheDocument();
  });
});
