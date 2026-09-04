import { createBrowserRouter, RouterProvider, type RouteObject } from 'react-router-dom';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { VerifyEmailPage } from '../features/auth/VerifyEmailPage';
import { ForgotPasswordPage } from '../features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../features/auth/ResetPasswordPage';
import { ConfirmEmailChangePage } from '../features/auth/ConfirmEmailChangePage';
import { AccountPage } from '../features/account/AccountPage';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { PublicHome } from '../features/landing/PublicHome';
import { AccountsPage } from '../features/accounts/AccountsPage';
import { TransactionsPage } from '../features/transactions/TransactionsPage';
import { ExpensesPage } from '../features/expenses/ExpensesPage';
import { IncomePage } from '../features/income/IncomePage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { CategoriesPage } from '../features/categories/CategoriesPage';
import { PaymentMethodsPage } from '../features/paymentMethods/PaymentMethodsPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { TelegramInfoPage } from '../features/telegram/TelegramInfoPage';
import { DataPage } from '../features/settings/DataPage';
import { OnboardingPage } from '../features/onboarding/OnboardingPage';
import { OnboardingGate } from '../features/onboarding/OnboardingGate';
import { AppLayout } from '../components/AppLayout';
import { RouteErrorBoundary } from '../components/RouteErrorBoundary';
import { UiGalleryPage } from '../features/dev/UiGalleryPage';

// F2: sin errorElement, un error de render desmonta el árbol y deja pantalla en blanco. Va en
// las tres raíces (login, register y el árbol autenticado) y no solo adentro de AppLayout, para
// que una pantalla pública que se rompa tampoco quede muda.
const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage />, errorElement: <RouteErrorBoundary /> },
  { path: '/register', element: <RegisterPage />, errorElement: <RouteErrorBoundary /> },
  // S25.2/25.3: destinos de los links que llegan por mail + pedido de reset. Públicas: el
  // usuario puede abrirlas en un browser sin sesión.
  { path: '/verify-email', element: <VerifyEmailPage />, errorElement: <RouteErrorBoundary /> },
  { path: '/forgot-password', element: <ForgotPasswordPage />, errorElement: <RouteErrorBoundary /> },
  { path: '/reset-password', element: <ResetPasswordPage />, errorElement: <RouteErrorBoundary /> },
  // S25.4: destino del link de cambio de email (llega al email NUEVO).
  { path: '/confirm-email-change', element: <ConfirmEmailChangePage />, errorElement: <RouteErrorBoundary /> },
  {
    element: <ProtectedRoute />,
    errorElement: <RouteErrorBoundary />,
    children: [
      // S46 (D1): la guía de primeros pasos va protegida pero FUERA de AppLayout. Todavía no hay
      // a dónde volver, y la nav de una app recién creada son cinco links a cinco pantallas
      // vacías. La salida es "Saltar por ahora", que está en todos los pasos.
      { path: '/onboarding', element: <OnboardingPage /> },
      {
        // Fix del 2 Sep: con la guia pendiente, TODA pantalla privada lleva a la guia. El
        // gate envuelve a AppLayout y no a /onboarding, que es su hermana de arriba: asi la
        // guia queda excluida sola y no hace falta chequear la ruta ni cuidarse de un loop.
        element: <OnboardingGate />,
        children: [
        {
          element: <AppLayout />,
          children: [
            { path: '/dashboard', element: <DashboardPage /> },
            { path: '/accounts', element: <AccountsPage /> },
            { path: '/transactions', element: <TransactionsPage /> },
            { path: '/expenses', element: <ExpensesPage /> },
            { path: '/income', element: <IncomePage /> },
            // Sprint 22.2: la página vieja de transferencias (TransfersPage) queda en el código
            // pero SIN ruta accesible — los transfers se registran desde Transacciones
            // (TransferForm embebido) y se sacó el link "Registrar pago" del resumen de tarjeta.
            { path: '/categories', element: <CategoriesPage /> },
            { path: '/payment-methods', element: <PaymentMethodsPage /> },
            { path: '/datos', element: <DataPage /> },
            { path: '/settings', element: <SettingsPage /> },
            // S25.4 (D7): datos de la cuenta, conectores y borrado — antes vivían en Ajustes.
            { path: '/account', element: <AccountPage /> },
            // S33: mini-landing del bot — se llega desde el ícono de info en Ajustes.
            { path: '/telegram', element: <TelegramInfoPage /> },
          ],
        },
        ],
      },
    ],
  },
  // `/` es la home pública (S19): PublicHome mira el estado de auth (useAuth) y
  // manda a /dashboard si ya hay sesión, o renderiza la landing (lazy, chunk propio)
  // si es un visitante anónimo. Antes redirigía siempre a /dashboard.
  { path: '/', element: <PublicHome />, errorElement: <RouteErrorBoundary /> },
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
