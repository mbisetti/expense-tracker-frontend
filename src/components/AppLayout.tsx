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
          {' · '}
          <NavLink to="/categories">Categorías</NavLink>
          {' · '}
          <NavLink to="/payment-methods">Métodos de pago</NavLink>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  );
}
