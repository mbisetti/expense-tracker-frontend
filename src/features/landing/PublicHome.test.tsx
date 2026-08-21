import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AuthContext, type AuthContextValue } from '../auth/context';
import { PublicHome } from './PublicHome';

function renderPublicHome(authValue: AuthContextValue) {
  const router = createMemoryRouter(
    [
      { path: '/', element: <PublicHome /> },
      { path: '/dashboard', element: <h1>Dashboard</h1> },
    ],
    { initialEntries: ['/'] },
  );

  render(
    <AuthContext.Provider value={authValue}>
      <RouterProvider router={router} />
    </AuthContext.Provider>,
  );
}

describe('PublicHome', () => {
  it('redirige a /dashboard si el usuario está autenticado', async () => {
    renderPublicHome({ accessToken: 'tok', status: 'authenticated', setAccessToken: () => {} });

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('renderiza la landing pública si el usuario es anónimo', async () => {
    renderPublicHome({ accessToken: null, status: 'unauthenticated', setAccessToken: () => {} });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Maat' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Crear cuenta' }).length).toBeGreaterThan(0);
  });

  it('muestra un estado de carga mientras se resuelve el auth', () => {
    renderPublicHome({ accessToken: null, status: 'loading', setAccessToken: () => {} });

    expect(screen.getByText('Cargando...')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1, name: 'Maat' })).not.toBeInTheDocument();
  });
});
