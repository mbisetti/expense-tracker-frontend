import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { useAuth } from './useAuth';
import { useVerifyEmail } from './useVerifyEmail';

// S25.2 — destino del link del mail de verificación. Postea el token al montar: el usuario ya
// hizo su click en el mail, pedirle otro acá sería un paso de más. El token se captura UNA vez
// (el POST lo consume y la URL puede quedar en el historial).
export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [token] = useState(() => searchParams.get('token'));
  const { status } = useAuth();
  const { mutate, isSuccess, isError } = useVerifyEmail();

  // Guard con ref y no solo el array de deps: StrictMode corre el efecto dos veces en dev y
  // el segundo POST llegaría con el token recién quemado.
  const fired = useRef(false);
  useEffect(() => {
    if (!token || fired.current) return;
    fired.current = true;
    mutate({ token });
  }, [token, mutate]);

  const backHome = status === 'authenticated'
    ? { to: '/dashboard', label: 'Ir a Maat' }
    : { to: '/login', label: 'Iniciar sesión' };

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <div className="flex flex-col gap-4 text-center">
          <h1 className="text-2xl font-semibold text-ink">Verificar email</h1>

          {!token || isError ? (
            <>
              <p className="text-sm text-body" role="alert">
                El link ya no sirve. Puede haber vencido o ya haberse usado.
              </p>
              <p className="text-sm text-muted">
                Entrá a la app y pedí uno nuevo con el botón Reenviar.
              </p>
            </>
          ) : isSuccess ? (
            <p className="text-sm text-body" role="status">
              ¡Listo! Tu email quedó verificado.
            </p>
          ) : (
            <p className="text-sm text-muted" role="status">
              Verificando tu email...
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
