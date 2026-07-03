import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { AccountsPage } from '../features/accounts/AccountsPage';
import { TransactionsPage } from '../features/transactions/TransactionsPage';
import { AppLayout } from '../components/AppLayout';

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/accounts', element: <AccountsPage /> },
          { path: '/transactions', element: <TransactionsPage /> },
        ],
      },
    ],
  },
  { path: '/', element: <Navigate to="/accounts" replace /> },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
