import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useLogout } from '../features/auth/useLogout';
import { Modal } from './ui/Modal';
import { MangoIcon, MenuIcon, UserIcon } from './ui/icons';

const NAV_LINK_CLASS = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-sm px-2 py-1 text-sm transition-colors duration-200 ease-out',
    isActive ? 'font-semibold text-brand' : 'text-body hover:text-ink',
  ].join(' ');

// Filas del drawer mobile: touch target de 44px + tono de marca en la activa.
const DRAWER_LINK_CLASS = ({ isActive }: { isActive: boolean }) =>
  [
    'flex min-h-11 items-center rounded-sm px-3 text-base transition-colors duration-200 ease-out',
    isActive ? 'bg-brand-bg font-semibold text-brand' : 'text-ink hover:bg-surface-sunken',
  ].join(' ');

const ICON_BTN_CLASS =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-sm text-ink transition-colors duration-200 ease-out hover:bg-brand-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand';

// Ítem del menú de la persona (Datos, Ajustes y preferencias).
const ACCOUNT_ITEM_CLASS =
  'flex min-h-11 items-center rounded-sm px-3 text-sm text-ink transition-colors duration-200 ease-out hover:bg-brand-bg';

// Nav principal CORTO (Sprint 21): Overview (ex-Dashboard), Cuentas, Transacciones, Ingresos.
// Categorías y Métodos de pago se movieron a Ajustes; el tema y Cerrar sesión, al menú de la
// persona. La ruta /transfers sigue viva (link "Registrar pago") pero no está en el nav.
const ROUTES = [
  { to: '/dashboard', label: 'Overview' },
  { to: '/accounts', label: 'Cuentas' },
  { to: '/transactions', label: 'Transacciones' },
  { to: '/expenses', label: 'Gastos' },
  { to: '/income', label: 'Ingresos' },
];

export function AppLayout() {
  const { mutate: logout, isPending } = useLogout();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  const closeMenu = () => setMenuOpen(false);
  const closeAccountMenu = () => setAccountMenuOpen(false);

  const handleLogout = () => {
    closeAccountMenu();
    logout();
  };

  // Cierra el menú de la persona al clickear afuera o con Esc (setState va en el handler,
  // no en el cuerpo del effect → sin lint set-state-in-effect).
  useEffect(() => {
    if (!accountMenuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAccountMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [accountMenuOpen]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-surface-elevated">
        <nav aria-label="Principal" className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-2">
          {/* Hamburger: sólo mobile (<lg). Abre el drawer lateral deslizante. */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-expanded={menuOpen}
            aria-label="Abrir menú"
            className={`${ICON_BTN_CLASS} -ml-2 lg:hidden`}
          >
            <MenuIcon className="h-6 w-6" />
          </button>

          {/* Marca: mango + Manguitos → lleva al inicio */}
          <NavLink to="/dashboard" className="flex items-center gap-2" aria-label="Manguitos, inicio">
            <MangoIcon className="h-6 w-6" />
            <span className="text-lg font-semibold text-ink">Manguitos</span>
          </NavLink>

          {/* Nav horizontal (desktop lg+) */}
          <div className="ml-2 hidden flex-wrap items-center gap-1 lg:flex">
            {ROUTES.map((route) => (
              <NavLink key={route.to} to={route.to} className={NAV_LINK_CLASS}>
                {route.label}
              </NavLink>
            ))}
          </div>

          {/* Menú de la persona (todos los viewports): Datos + Ajustes y preferencias + Cerrar sesión */}
          <div ref={accountMenuRef} className="relative ml-auto">
            <button
              type="button"
              onClick={() => setAccountMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={accountMenuOpen}
              aria-label="Cuenta"
              className={ICON_BTN_CLASS}
            >
              <UserIcon className="h-5 w-5" />
            </button>

            {accountMenuOpen && (
              <div
                role="menu"
                aria-label="Cuenta"
                className="absolute right-0 top-full z-50 mt-1 w-56 rounded-md border border-line bg-surface-elevated p-1 shadow-md"
              >
                <NavLink
                  to="/datos"
                  role="menuitem"
                  onClick={closeAccountMenu}
                  className={ACCOUNT_ITEM_CLASS}
                >
                  Datos
                </NavLink>
                <NavLink
                  to="/settings"
                  role="menuitem"
                  onClick={closeAccountMenu}
                  className={ACCOUNT_ITEM_CLASS}
                >
                  Ajustes y preferencias
                </NavLink>
                <div className="my-1 border-t border-line" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  disabled={isPending}
                  className="flex min-h-11 w-full items-center rounded-sm px-3 text-sm text-ink transition-colors duration-200 ease-out hover:bg-expense/10 hover:text-expense disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending ? 'Saliendo...' : 'Cerrar sesión'}
                </button>
              </div>
            )}
          </div>
        </nav>
      </header>

      {/* Drawer lateral (mobile): se desliza de izquierda a derecha */}
      <Modal side="left" open={menuOpen} onClose={closeMenu} title="Menú">
        <nav aria-label="Menú" className="flex flex-col gap-1">
          {ROUTES.map((route) => (
            <NavLink key={route.to} to={route.to} onClick={closeMenu} className={DRAWER_LINK_CLASS}>
              {route.label}
            </NavLink>
          ))}
        </nav>
      </Modal>

      <main className="mx-auto w-full max-w-5xl px-4 pb-8">
        <Outlet />
      </main>
    </>
  );
}
