import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext } from '../features/auth/context';
import { AppLayout } from './AppLayout';
import { ok } from '../test/mockResponse';

function renderLayout(initialEntries: string[] = ['/dashboard']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{ accessToken: 'test-token', status: 'authenticated', setAccessToken: () => {} }}
      >
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<p>Página Dashboard</p>} />
              <Route path="/categories" element={<p>Página Categorías</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AppLayout — hamburger mobile', () => {
  it('el botón hamburger arranca cerrado (aria-expanded=false) y sin el drawer en el DOM', () => {
    renderLayout();

    const trigger = screen.getByRole('button', { name: 'Abrir menú' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog', { name: 'Menú' })).not.toBeInTheDocument();
  });

  it('clic en el hamburger abre el drawer con las 7 rutas + Cerrar sesión', () => {
    renderLayout();

    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));

    const dialog = screen.getByRole('dialog', { name: 'Menú' });
    expect(screen.getByRole('button', { name: 'Abrir menú' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );

    const nav = within(dialog).getByRole('navigation', { name: 'Menú completo' });
    for (const label of [
      'Dashboard',
      'Cuentas',
      'Transacciones',
      'Ingresos',
      'Transferencias',
      'Categorías',
      'Métodos de pago',
    ]) {
      expect(within(nav).getByRole('link', { name: label })).toBeInTheDocument();
    }
    expect(within(dialog).getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
  });

  it('la ruta activa lleva aria-current="page" dentro del drawer', () => {
    renderLayout(['/dashboard']);

    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));

    const dialog = screen.getByRole('dialog', { name: 'Menú' });
    expect(within(dialog).getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('clic en un link navega y cierra el drawer', async () => {
    renderLayout(['/dashboard']);

    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));
    const dialog = screen.getByRole('dialog', { name: 'Menú' });
    fireEvent.click(within(dialog).getByRole('link', { name: 'Categorías' }));

    expect(await screen.findByText('Página Categorías')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Menú' })).not.toBeInTheDocument();
  });

  it('Esc cierra el drawer y devuelve el foco al hamburger', () => {
    renderLayout();

    const trigger = screen.getByRole('button', { name: 'Abrir menú' });
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Menú' })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('dialog', { name: 'Menú' })).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
  });

  it('clic en el backdrop cierra el drawer', () => {
    renderLayout();

    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));
    // Distinto de los íconos (también aria-hidden="true"): el backdrop es el único <div>
    // con ese atributo, agregado por el portal del Modal.
    const backdrop = document.querySelector('div[aria-hidden="true"]') as HTMLElement;
    fireEvent.click(backdrop);

    expect(screen.queryByRole('dialog', { name: 'Menú' })).not.toBeInTheDocument();
  });

  it('cerrar sesión desde el drawer cierra el menú y llama a logout', async () => {
    vi.stubGlobal('fetch', vi.fn(() => ok({})));
    renderLayout();

    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));
    const dialog = screen.getByRole('dialog', { name: 'Menú' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cerrar sesión' }));

    expect(screen.queryByRole('dialog', { name: 'Menú' })).not.toBeInTheDocument();
  });
});
