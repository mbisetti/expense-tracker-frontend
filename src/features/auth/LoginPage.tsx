import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLogin } from './useLogin';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { GoogleButton } from './GoogleButton';
import { useToast } from '../../components/ui/toastContext';
import type { ApiError } from '../../lib/http';

function loginErrorMessage(error: ApiError): string {
  switch (error.code) {
    case 'INVALID_CREDENTIALS':
      return 'Email o contraseña incorrectos.';
    case 'RATE_LIMIT_EXCEEDED':
      return 'Demasiados intentos. Esperá un momento.';
    case 'VALIDATION_ERROR':
      return 'Revisá los datos del formulario.';
    default:
      return 'Algo salió mal. Intentá de nuevo.';
  }
}

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const location = useLocation();
  const toast = useToast();
  const { mutate, isPending } = useLogin();

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    mutate(
      { email, password },
      { onError: (error) => toast.error(loginErrorMessage(error)) },
    );
  };

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <h1 className="text-2xl font-semibold text-ink">Iniciar sesión</h1>

          <Input
            label="Email"
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isPending}
          />

          <Input
            label="Contraseña"
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            disabled={isPending}
          />

          <Button type="submit" loading={isPending} className="mt-2">
            {isPending ? 'Ingresando...' : 'Ingresar'}
          </Button>

          <div className="flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-line" />
            <span className="text-xs text-muted">o</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <GoogleButton />

          <p className="text-center text-sm text-body">
            ¿No tenés cuenta?{' '}
            <Link to="/register" state={location.state} className="text-brand">
              Registrate
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
}
