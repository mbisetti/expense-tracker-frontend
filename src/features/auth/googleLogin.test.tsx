import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import { LoginPage } from './LoginPage';
import { RegisterPage } from './RegisterPage';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { jsonResponse } from '../../test/mockResponse';

// Mock del módulo GIS: NUNCA se carga el script real. signInWithGoogle simula que el usuario
// eligió su cuenta en One Tap → dispara el callback con un ID token fake.
vi.mock('../../lib/googleAuth', () => ({
  GOOGLE_CLIENT_ID: 'test-client-id',
  loadGoogleIdentity: vi.fn(() => Promise.resolve({})),
  signInWithGoogle: vi.fn(async (onCredential: (idToken: string) => void) => {
    onCredential('fake-jwt');
  }),
}));

// Body del último POST a /auth/google (para asertar el idToken enviado).
const googleReq: { body?: string } = {};

function renderApp(initialEntries: string[]) {
  const router = createMemoryRouter(
    [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/dashboard', element: <h1>Dashboard</h1> },
      { path: '/accounts', element: <h1>Cuentas</h1> },
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

function stubFetch(googleResponder: (input: RequestInfo | URL) => Promise<Response>) {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/auth/refresh')) {
        return jsonResponse(401, { error: 'INVALID_REFRESH_TOKEN' });
      }
      if (url.includes('/auth/google')) {
        googleReq.body = typeof init?.body === 'string' ? init.body : undefined;
        return googleResponder(input);
      }
      return jsonResponse(200, {});
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  googleReq.body = undefined;
});

describe('login con Google', () => {
  it('la página de login muestra el botón de Google', async () => {
    stubFetch(() => jsonResponse(200, { accessToken: 'tok' }));
    renderApp(['/login']);

    await screen.findByRole('heading', { name: 'Iniciar sesión' });
    expect(await screen.findByRole('button', { name: 'Continuar con Google' })).toBeInTheDocument();
  });

  it('la página de registro también muestra el botón de Google', async () => {
    stubFetch(() => jsonResponse(200, { accessToken: 'tok' }));
    renderApp(['/register']);

    await screen.findByRole('heading', { name: 'Crear cuenta' });
    expect(await screen.findByRole('button', { name: 'Continuar con Google' })).toBeInTheDocument();
  });

  it('al hacer click postea a /auth/google con el idToken y redirige', async () => {
    stubFetch(() => jsonResponse(200, { accessToken: 'tok' }));
    renderApp(['/login']);

    const btn = await screen.findByRole('button', { name: 'Continuar con Google' });
    await act(async () => {
      fireEvent.click(btn);
    });

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(googleReq.body).toBeDefined();
    expect(JSON.parse(googleReq.body!)).toEqual({ idToken: 'fake-jwt' });
  });

  it('un error del backend en Google muestra toast y no redirige', async () => {
    stubFetch(() => jsonResponse(409, { error: 'GOOGLE_ACCOUNT_MISMATCH' }));
    renderApp(['/login']);

    const btn = await screen.findByRole('button', { name: 'Continuar con Google' });
    await act(async () => {
      fireEvent.click(btn);
    });

    expect(
      await screen.findByText('Ese email ya está vinculado a otra cuenta de Google.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });
});
