import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useLogout } from '../features/auth/useLogout';
import { BottomNav } from './ui/BottomNav';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { MenuIcon } from './ui/icons';

const NAV_LINK_CLASS = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-sm px-2 py-1 text-sm transition-colors duration-200 ease-out',
    isActive ? 'font-semibold text-brand' : 'text-body hover:text-ink',
  ].join(' ');

// Menú del drawer mobile: touch target de 44px por fila + tono de marca en la activa,
// mismo criterio que NAV_LINK_CLASS/BottomNav.
const DRAWER_LINK_CLASS = ({ isActive }: { isActive: boolean }) =>
  [
    'flex min-h-11 items-center rounded-sm px-3 text-base transition-colors duration-200 ease-out',
    isActive ? 'bg-brand-bg font-semibold text-brand' : 'text-ink hover:bg-surface-sunken',
  ].join(' ');

// Rutas completas de la app (7): el header horizontal (desktop, `lg+`) las muestra todas;
// el drawer mobile (debajo de `lg`) también, porque el BottomNav de abajo sólo cubre 4.
const ROUTES = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/accounts', label: 'Cuentas' },
  { to: '/transactions', label: 'Transacciones' },
  { to: '/income', label: 'Ingresos' },
  { to: '/transfers', label: 'Transferencias' },
  { to: '/categories', label: 'Categorías' },
  { to: '/payment-methods', label: 'Métodos de pago' },
];

export function AppLayout() {
  const { mutate: logout, isPending } = useLogout();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  const handleLogout = () => {
    closeMenu();
    logout();
  };

  return (
    <>
      <header className="border-b border-line bg-surface-elevated">
        <nav
          aria-label="Principal"
          className="mx-auto flex max-w-5xl items-center gap-1 px-4 py-2"
        >
          {/* Hamburger: sólo debajo de `lg` (el header horizontal ya cubre desktop). Abre
              el drawer con las 7 rutas + logout, así ninguna queda huérfana en mobile. */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-expanded={menuOpen}
            aria-label="Abrir menú"
            className="-m-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-sm text-ink transition-colors duration-200 ease-out hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 lg:hidden"
          >
            <MenuIcon className="h-6 w-6" />
          </button>

          <div className="hidden flex-wrap items-center gap-1 lg:flex">
            {ROUTES.map((route) => (
              <NavLink key={route.to} to={route.to} className={NAV_LINK_CLASS}>
                {route.label}
              </NavLink>
            ))}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto hidden lg:inline-flex"
            onClick={() => logout()}
            disabled={isPending}
          >
            {isPending ? 'Saliendo...' : 'Cerrar sesión'}
          </Button>
        </nav>
      </header>

      <Modal open={menuOpen} onClose={closeMenu} title="Menú" className="max-w-xs">
        <nav aria-label="Menú completo" className="flex flex-col gap-1">
          {ROUTES.map((route) => (
            <NavLink key={route.to} to={route.to} onClick={closeMenu} className={DRAWER_LINK_CLASS}>
              {route.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-4 border-t border-line pt-4">
          <Button variant="secondary" className="w-full" onClick={handleLogout} disabled={isPending}>
            {isPending ? 'Saliendo...' : 'Cerrar sesión'}
          </Button>
        </div>
      </Modal>

      <main className="mx-auto w-full max-w-5xl px-4 pb-16 md:pb-0">
        <Outlet />
      </main>
      <BottomNav />
    </>
  );
}
