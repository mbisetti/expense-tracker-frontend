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
              <Route path="/dashboard" element={<p>Página Overview</p>} />
              <Route path="/accounts" element={<p>Página Cuentas</p>} />
              <Route path="/settings" element={<p>Página Ajustes</p>} />
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

describe('AppLayout — nav', () => {
  it('el hamburger arranca cerrado y sin drawer en el DOM', () => {
    renderLayout();
    expect(screen.getByRole('button', { name: 'Abrir menú' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.queryByRole('dialog', { name: 'Menú' })).not.toBeInTheDocument();
  });

  it('el hamburger abre el drawer lateral con las 4 rutas + Ajustes (sin Categorías/Métodos)', () => {
    renderLayout();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));

    const dialog = screen.getByRole('dialog', { name: 'Menú' });
    const nav = within(dialog).getByRole('navigation', { name: 'Menú' });
    for (const label of ['Overview', 'Cuentas', 'Transacciones', 'Ingresos', 'Ajustes']) {
      expect(within(nav).getByRole('link', { name: label })).toBeInTheDocument();
    }
    expect(within(nav).queryByRole('link', { name: 'Categorías' })).not.toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Métodos de pago' })).not.toBeInTheDocument();
  });

  it('la ruta activa lleva aria-current="page" en el drawer', () => {
    renderLayout(['/dashboard']);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));

    const dialog = screen.getByRole('dialog', { name: 'Menú' });
    expect(within(dialog).getByRole('link', { name: 'Overview' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('clic en un link del drawer navega y lo cierra', async () => {
    renderLayout(['/dashboard']);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));
    const dialog = screen.getByRole('dialog', { name: 'Menú' });
    fireEvent.click(within(dialog).getByRole('link', { name: 'Ajustes' }));

    expect(await screen.findByText('Página Ajustes')).toBeInTheDocument();
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
    const backdrop = document.querySelector('div[aria-hidden="true"]') as HTMLElement;
    fireEvent.click(backdrop);
    expect(screen.queryByRole('dialog', { name: 'Menú' })).not.toBeInTheDocument();
  });

  it('el menú de la persona: Ajustes + Cerrar sesión, y cerrar sesión cierra el menú y llama a logout', () => {
    vi.stubGlobal('fetch', vi.fn(() => ok({})));
    renderLayout();

    // arranca cerrado
    expect(screen.queryByRole('menu', { name: 'Cuenta' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cuenta' }));
    const menu = screen.getByRole('menu', { name: 'Cuenta' });
    expect(within(menu).getByRole('menuitem', { name: 'Ajustes y preferencias' })).toBeInTheDocument();

    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Cerrar sesión' }));
    expect(screen.queryByRole('menu', { name: 'Cuenta' })).not.toBeInTheDocument();
  });

  it('el tema y Cerrar sesión ya no están sueltos en el header', () => {
    renderLayout();
    // el toggle de tema se movió a Ajustes
    expect(screen.queryByRole('button', { name: /tema/i })).not.toBeInTheDocument();
    // cerrar sesión sólo vive dentro del menú de la persona (rol menuitem, no button suelto)
    expect(screen.queryByRole('button', { name: 'Cerrar sesión' })).not.toBeInTheDocument();
  });
});
