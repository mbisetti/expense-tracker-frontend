import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import { LoginPage } from '../auth/LoginPage';
import { RegisterPage } from '../auth/RegisterPage';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { jsonResponse } from '../../test/mockResponse';

// Mismo mock de GIS que googleLogin.test: nunca se carga el script real.
vi.mock('../../lib/googleAuth', () => ({
  GOOGLE_CLIENT_ID: 'test-client-id',
  loadGoogleIdentity: vi.fn(() => Promise.resolve({})),
  signInWithGoogle: vi.fn(async (onCredential: (idToken: string) => void) => {
    onCredential('fake-jwt');
  }),
}));

const ME = {
  id: 'u1',
  email: 'nuevo@test.com',
  name: 'Nuevo',
  defaultCurrency: 'USD',
  workingCurrencies: [],
  hasPassword: false,
  googleLinked: true,
  emailVerified: true,
  onboarded: false,
  createdAt: '2026-09-01T10:00:00Z',
};

function renderApp(initialEntries: string[]) {
  const router = createMemoryRouter(
    [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/onboarding', element: <h1>Guía</h1> },
      { path: '/dashboard', element: <h1>Dashboard</h1> },
      { path: '/accounts', element: <h1>Cuentas</h1> },
      {
        element: <ProtectedRoute />,
        children: [{ path: '/transactions', element: <h1>Transacciones</h1> }],
      },
    ],
    { initialEntries },
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

function stubFetch(me: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/auth/refresh')) return jsonResponse(401, { error: 'INVALID_REFRESH_TOKEN' });
      if (url.includes('/auth/google')) return jsonResponse(200, { accessToken: 'tok' });
      if (url.includes('/auth/register')) return jsonResponse(200, { accessToken: 'tok' });
      if (url.includes('/users/me')) return jsonResponse(200, me);
      return jsonResponse(200, {});
    }),
  );
}

async function clickGoogle() {
  const btn = await screen.findByRole('button', { name: 'Continuar con Google' });
  await act(async () => {
    fireEvent.click(btn);
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

// S46 (D3) — dónde aterriza cada quien. El caso que motivó el sprint es el de Google: hasta acá
// un usuario recién creado caía en un dashboard vacío SIN ningún CTA.
describe('destino post-registro (S46 D3)', () => {
  it('el registro por email cae en la guía', async () => {
    stubFetch(ME);
    renderApp(['/register']);

    await screen.findByRole('heading', { name: 'Crear cuenta' });
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Nuevo' } });
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'nuevo@test.com' } });
    fireEvent.change(screen.getByLabelText(/Contraseña/), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByRole('heading', { name: 'Guía' })).toBeInTheDocument();
  });

  it('con Google, un usuario que nunca vio la guía cae en la guía', async () => {
    stubFetch(ME);
    renderApp(['/login']);

    await clickGoogle();

    expect(await screen.findByRole('heading', { name: 'Guía' })).toBeInTheDocument();
  });

  // El otro lado de find-or-create: el que entra hace meses no vuelve a ver el wizard nunca.
  it('con Google, un usuario que ya la vio cae en el dashboard', async () => {
    stubFetch({ ...ME, onboarded: true });
    renderApp(['/login']);

    await clickGoogle();

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  // Si el perfil no se puede leer, el destino es el dashboard: errar para el lado de NO mandar a
  // la guía a alguien que ya usa la app.
  it('si el perfil falla, con Google cae en el dashboard', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/auth/refresh')) return jsonResponse(401, { error: 'INVALID_REFRESH_TOKEN' });
        if (url.includes('/auth/google')) return jsonResponse(200, { accessToken: 'tok' });
        if (url.includes('/users/me')) return jsonResponse(500, { error: 'BOOM' });
        return jsonResponse(200, {});
      }),
    );
    renderApp(['/login']);

    await clickGoogle();

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  // redirectFrom sigue ganando: venías a un link protegido y ahí volvés, guía o no.
  it('venir de un link protegido le gana a la guía', async () => {
    stubFetch(ME);
    renderApp(['/transactions']);

    await screen.findByRole('heading', { name: 'Iniciar sesión' });
    await clickGoogle();

    expect(await screen.findByRole('heading', { name: 'Transacciones' })).toBeInTheDocument();
  });
});
