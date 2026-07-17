import { createBrowserRouter, RouterProvider, type RouteObject } from 'react-router-dom';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { PublicHome } from '../features/landing/PublicHome';
import { AccountsPage } from '../features/accounts/AccountsPage';
import { TransactionsPage } from '../features/transactions/TransactionsPage';
import { IncomePage } from '../features/income/IncomePage';
import { TransfersPage } from '../features/transfers/TransfersPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { CategoriesPage } from '../features/categories/CategoriesPage';
import { PaymentMethodsPage } from '../features/paymentMethods/PaymentMethodsPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { DataPage } from '../features/settings/DataPage';
import { AppLayout } from '../components/AppLayout';
import { UiGalleryPage } from '../features/dev/UiGalleryPage';

const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/accounts', element: <AccountsPage /> },
          { path: '/transactions', element: <TransactionsPage /> },
          { path: '/income', element: <IncomePage /> },
          { path: '/transfers', element: <TransfersPage /> },
          { path: '/categories', element: <CategoriesPage /> },
          { path: '/payment-methods', element: <PaymentMethodsPage /> },
          { path: '/datos', element: <DataPage /> },
          { path: '/settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
  // `/` es la home pública (S19): PublicHome mira el estado de auth (useAuth) y
  // manda a /dashboard si ya hay sesión, o renderiza la landing (lazy, chunk propio)
  // si es un visitante anónimo. Antes redirigía siempre a /dashboard.
  { path: '/', element: <PublicHome /> },
];

// Styleguide viva (S18): sólo se registra en dev. import.meta.env.DEV es `false` en el
// build de producción, así Rollup elimina esta rama muerta (y con ella la única
// referencia a UiGalleryPage, dejando el import sin uso y por lo tanto tree-shakeado)
// — no queda ruta ni código alcanzable en prod.
if (import.meta.env.DEV) {
  routes.push({ path: '/dev/ui', element: <UiGalleryPage /> });
}

const router = createBrowserRouter(routes);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
