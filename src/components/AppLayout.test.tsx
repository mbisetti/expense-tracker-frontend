import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext } from '../features/auth/context';
import { ToastProvider } from './ui/ToastProvider';
import { runBackInterceptors } from '../lib/nativeBack';
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
        {/* S25.2: ToastProvider porque el banner de verificación (dentro del header) usa
            useToast — en la app real envuelve al router entero desde main.tsx. */}
        <ToastProvider>
          <MemoryRouter initialEntries={initialEntries}>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<p>Página Overview</p>} />
                <Route path="/accounts" element={<p>Página Cuentas</p>} />
                <Route path="/settings" element={<p>Página Ajustes</p>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </ToastProvider>
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

  it('el hamburger abre el drawer lateral con las 4 rutas (sin Ajustes/Categorías/Métodos)', () => {
    renderLayout();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú' }));

    const dialog = screen.getByRole('dialog', { name: 'Menú' });
    const nav = within(dialog).getByRole('navigation', { name: 'Menú' });
    for (const label of ['Overview', 'Cuentas', 'Transacciones', 'Ingresos']) {
      expect(within(nav).getByRole('link', { name: label })).toBeInTheDocument();
    }
    // Ajustes vive en el menú de la persona, no en el drawer; Categorías/Métodos en Ajustes
    expect(within(nav).queryByRole('link', { name: 'Ajustes' })).not.toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Categorías' })).not.toBeInTheDocument();
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
    fireEvent.click(within(dialog).getByRole('link', { name: 'Cuentas' }));

    expect(await screen.findByText('Página Cuentas')).toBeInTheDocument();
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

  it('el menú de la persona: Datos + Ajustes y preferencias + Cerrar sesión, y cerrar sesión cierra el menú y llama a logout', () => {
    vi.stubGlobal('fetch', vi.fn(() => ok({})));
    renderLayout();

    // arranca cerrado
    expect(screen.queryByRole('menu', { name: 'Cuenta' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cuenta' }));
    const menu = screen.getByRole('menu', { name: 'Cuenta' });
    expect(within(menu).getByRole('menuitem', { name: 'Datos' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Ajustes y preferencias' })).toBeInTheDocument();

    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Cerrar sesión' }));
    expect(screen.queryByRole('menu', { name: 'Cuenta' })).not.toBeInTheDocument();
  });

  // S44 — botón físico "atrás" de Android: el menú de la persona se registra en la pila de
  // `nativeBack` mientras está abierto (el drawer ya está cubierto por ser un Modal). Acá se
  // corre la pila a mano, que es lo mismo que hace el listener nativo de `nativeBootstrap`.
  it('el back de Android cierra el menú de la persona y no sale de la app', () => {
    renderLayout();
    fireEvent.click(screen.getByRole('button', { name: 'Cuenta' }));
    expect(screen.getByRole('menu', { name: 'Cuenta' })).toBeInTheDocument();

    let consumido = false;
    act(() => {
      consumido = runBackInterceptors();
    });

    expect(consumido).toBe(true);
    expect(screen.queryByRole('menu', { name: 'Cuenta' })).not.toBeInTheDocument();
    // Cerrado no se mete en el camino del back.
    expect(runBackInterceptors()).toBe(false);
  });

  it('el tema y Cerrar sesión ya no están sueltos en el header', () => {
    renderLayout();
    // el toggle de tema se movió a Ajustes
    expect(screen.queryByRole('button', { name: /tema/i })).not.toBeInTheDocument();
    // cerrar sesión sólo vive dentro del menú de la persona (rol menuitem, no button suelto)
    expect(screen.queryByRole('button', { name: 'Cerrar sesión' })).not.toBeInTheDocument();
  });
});
