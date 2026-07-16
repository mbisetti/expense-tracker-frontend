import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/dashboard', label: 'Overview' },
  { to: '/transactions', label: 'Transacciones' },
  { to: '/income', label: 'Ingresos' },
  { to: '/accounts', label: 'Cuentas' },
];

// BottomNav del design system (Bloque 3) — supersede a components/BottomNav.tsx (que
// queda tal cual para no tocar pantallas existentes; se migra en S19). Misma estructura/
// links/comportamiento, re-skin con tokens: tab activo usa `brand`, resto usa surface/line.
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
                [
                  'flex min-h-11 items-center justify-center px-2 text-center text-sm transition-colors duration-200 ease-out',
                  isActive ? 'font-semibold text-brand' : 'text-body hover:text-ink',
                ].join(' ')
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
