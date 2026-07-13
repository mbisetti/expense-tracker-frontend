import { NavLink, Outlet } from 'react-router-dom';
import { useLogout } from '../features/auth/useLogout';
import { BottomNav } from './BottomNav';

export function AppLayout() {
  const { mutate: logout, isPending } = useLogout();

  return (
    <>
      <header>
        <nav aria-label="Principal">
          <NavLink to="/dashboard">Dashboard</NavLink>
          {' · '}
          <NavLink to="/accounts">Cuentas</NavLink>
          {' · '}
          <NavLink to="/transactions">Transacciones</NavLink>
          {' · '}
          <NavLink to="/income">Ingresos</NavLink>
          {' · '}
          <NavLink to="/categories">Categorías</NavLink>
          {' · '}
          <NavLink to="/payment-methods">Métodos de pago</NavLink>
          {' · '}
          <button type="button" onClick={() => logout()} disabled={isPending}>
            {isPending ? 'Saliendo...' : 'Cerrar sesión'}
          </button>
        </nav>
      </header>
      <main className="pb-16 md:pb-0">
        <Outlet />
      </main>
      <BottomNav />
    </>
  );
}
