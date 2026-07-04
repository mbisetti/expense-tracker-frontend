import { NavLink, Outlet } from 'react-router-dom';

export function AppLayout() {
  return (
    <>
      <header>
        <nav aria-label="Principal">
          <NavLink to="/dashboard">Dashboard</NavLink>
          {' · '}
          <NavLink to="/accounts">Cuentas</NavLink>
          {' · '}
          <NavLink to="/transactions">Transacciones</NavLink>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  );
}
