import { NavLink, Outlet } from 'react-router-dom';
import { useLogout } from '../features/auth/useLogout';
import { BottomNav } from './ui/BottomNav';
import { Button } from './ui/Button';

const NAV_LINK_CLASS = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-sm px-2 py-1 text-sm transition-colors duration-200 ease-out',
    isActive ? 'font-semibold text-brand' : 'text-body hover:text-ink',
  ].join(' ');

export function AppLayout() {
  const { mutate: logout, isPending } = useLogout();

  return (
    <>
      <header className="border-b border-line bg-surface-elevated">
        <nav
          aria-label="Principal"
          className="mx-auto flex max-w-4xl flex-wrap items-center gap-1 px-4 py-2"
        >
          <NavLink to="/dashboard" className={NAV_LINK_CLASS}>
            Dashboard
          </NavLink>
          <NavLink to="/accounts" className={NAV_LINK_CLASS}>
            Cuentas
          </NavLink>
          <NavLink to="/transactions" className={NAV_LINK_CLASS}>
            Transacciones
          </NavLink>
          <NavLink to="/income" className={NAV_LINK_CLASS}>
            Ingresos
          </NavLink>
          <NavLink to="/transfers" className={NAV_LINK_CLASS}>
            Transferencias
          </NavLink>
          <NavLink to="/categories" className={NAV_LINK_CLASS}>
            Categorías
          </NavLink>
          <NavLink to="/payment-methods" className={NAV_LINK_CLASS}>
            Métodos de pago
          </NavLink>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => logout()}
            disabled={isPending}
          >
            {isPending ? 'Saliendo...' : 'Cerrar sesión'}
          </Button>
        </nav>
      </header>
      <main className="pb-16 md:pb-0">
        <Outlet />
      </main>
      <BottomNav />
    </>
  );
}
