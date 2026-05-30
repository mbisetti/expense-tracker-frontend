import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { AccountsPage } from '../features/accounts/AccountsPage';

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/accounts', element: <AccountsPage /> },
    ],
  },
  { path: '/', element: <Navigate to="/accounts" replace /> },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
