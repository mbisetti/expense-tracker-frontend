import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/toastContext';
import { useForgotPassword } from './useForgotPassword';
import type { ApiError } from '../../lib/http';

function forgotErrorMessage(error: ApiError): string {
  switch (error.code) {
    case 'RATE_LIMIT_EXCEEDED':
      return 'Demasiados intentos. Esperá un momento.';
    case 'VALIDATION_ERROR':
      return 'Revisá el email.';
    default:
      return 'Algo salió mal. Intentá de nuevo.';
  }
}

// S25.3 — pedir el link de reset. La pantalla de éxito dice SIEMPRE lo mismo, exista o no el
// email (anti-enumeración, espejo del 204 constante del server).
export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const toast = useToast();
  const { mutate, isPending } = useForgotPassword();

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    mutate(
      { email },
      {
        onSuccess: () => setSent(true),
        onError: (error) => toast.error(forgotErrorMessage(error)),
      },
    );
  };

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        {sent ? (
          <div className="flex flex-col gap-4 text-center">
            <h1 className="text-2xl font-semibold text-ink">Revisá tu casilla</h1>
            <p className="text-sm text-body" role="status">
              Si existe una cuenta con ese email, te mandamos un link para restablecer la
              contraseña. Vence en 30 minutos.
            </p>
            <p className="text-sm text-muted">
              Si entraste con Google, no tenés contraseña: volvé e ingresá con el botón de
              Google.
            </p>
            <Link to="/login" className="text-sm text-brand">
              Volver a iniciar sesión
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <h1 className="text-2xl font-semibold text-ink">Restablecer contraseña</h1>
            <p className="text-sm text-muted">
              Decinos tu email y te mandamos un link para elegir una contraseña nueva.
            </p>

            <Input
              label="Email"
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isPending}
            />

            <Button type="submit" loading={isPending} className="mt-2">
              {isPending ? 'Mandando...' : 'Mandar link'}
            </Button>

            <p className="text-center text-sm text-body">
              <Link to="/login" className="text-brand">
                Volver a iniciar sesión
              </Link>
            </p>
          </form>
        )}
      </Card>
    </div>
  );
}
