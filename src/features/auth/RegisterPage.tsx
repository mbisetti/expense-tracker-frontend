import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useRegister } from './useRegister';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { GoogleButton } from './GoogleButton';
import { useToast } from '../../components/ui/toastContext';
import type { ApiError } from '../../lib/http';

function registerErrorMessage(error: ApiError): string {
  switch (error.code) {
    case 'EMAIL_ALREADY_EXISTS':
      return 'Ese email ya está registrado.';
    case 'VALIDATION_ERROR':
      return 'Revisá los datos del formulario.';
    case 'RATE_LIMIT_EXCEEDED':
      return 'Demasiados intentos. Esperá un momento.';
    default:
      return 'Algo salió mal. Intentá de nuevo.';
  }
}

export function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const location = useLocation();
  const toast = useToast();
  const { mutate, isPending } = useRegister();

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    mutate(
      { name, email, password },
      { onError: (error) => toast.error(registerErrorMessage(error)) },
    );
  };

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <h1 className="text-2xl font-semibold text-ink">Crear cuenta</h1>

          <Input
            label="Nombre"
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={isPending}
          />

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
            {isPending ? 'Creando cuenta...' : 'Crear cuenta'}
          </Button>

          <div className="flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-line" />
            <span className="text-xs text-muted">o</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <GoogleButton />

          <p className="text-center text-sm text-body">
            ¿Ya tenés cuenta?{' '}
            <Link to="/login" state={location.state} className="text-brand">
              Iniciá sesión
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
}
