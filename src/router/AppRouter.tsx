import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";

function LoginPage() {
    return <h1>Login Page</h1>;
}

function AccountPage() {
    return <h1>Account Page</h1>;
}

const router = createBrowserRouter([
    {
    path: "/",
    element: <Navigate to="/login" replace />,
    },
    {
        path: "/login",
        element: <LoginPage />,
    },
    {   
        path: "/accounts",
        element: <AccountPage />,
    },
]);

export function AppRouter() {
    return <RouterProvider router={router} />;
}