import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { useAuth } from './useAuth';
import { useConfirmEmailChange } from './useConfirmEmailChange';

// S25.4 (D4) — destino del link que llega al email NUEVO. Calco de VerifyEmailPage: postea el
// token al montar, con guard contra el doble efecto de StrictMode.
export function ConfirmEmailChangePage() {
  const [searchParams] = useSearchParams();
  const [token] = useState(() => searchParams.get('token'));
  const { status } = useAuth();
  const { mutate, isSuccess, isError, error } = useConfirmEmailChange();

  const fired = useRef(false);
  useEffect(() => {
    if (!token || fired.current) return;
    fired.current = true;
    mutate({ token });
  }, [token, mutate]);

  const backHome = status === 'authenticated'
    ? { to: '/account', label: 'Ir a tu cuenta' }
    : { to: '/login', label: 'Iniciar sesión' };

  const errorMessage =
    error?.code === 'EMAIL_ALREADY_EXISTS'
      ? 'Ese email ya está en uso por otra cuenta. El cambio no se aplicó.'
      : 'El link ya no sirve. Puede haber vencido o ya haberse usado.';

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <div className="flex flex-col gap-4 text-center">
          <h1 className="text-2xl font-semibold text-ink">Cambio de email</h1>

          {!token || isError ? (
            <>
              <p className="text-sm text-body" role="alert">
                {!token ? 'El link no es válido.' : errorMessage}
              </p>
              <p className="text-sm text-muted">
                Podés pedir el cambio de nuevo desde Cuenta en la app.
              </p>
            </>
          ) : isSuccess ? (
            <p className="text-sm text-body" role="status">
              ¡Listo! Tu email quedó actualizado y verificado.
            </p>
          ) : (
            <p className="text-sm text-muted" role="status">
              Confirmando el cambio...
            </p>
          )}

          <Link to={backHome.to} className="text-sm text-brand">
            {backHome.label}
          </Link>
        </div>
      </Card>
    </div>
  );
}
