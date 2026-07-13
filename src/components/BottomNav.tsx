import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/transactions', label: 'Transacciones' },
  { to: '/income', label: 'Ingresos' },
  { to: '/accounts', label: 'Cuentas' },
];

export function BottomNav() {
  return (
    <nav
      aria-label="Navegación inferior"
      className="fixed bottom-0 inset-x-0 z-10 border-t border-line bg-surface md:hidden"
    >
      <ul className="flex list-none p-0 m-0">
        {TABS.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              to={tab.to}
              className={({ isActive }) =>
                `block text-center py-3 text-sm ${isActive ? 'text-brand font-semibold' : 'text-body'}`
              }
            >
              {tab.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
