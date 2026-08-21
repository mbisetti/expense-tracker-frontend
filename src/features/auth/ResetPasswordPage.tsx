import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/toastContext';
import { useResetPassword } from './useResetPassword';
import type { ApiError } from '../../lib/http';

function resetErrorMessage(error: ApiError): string {
  switch (error.code) {
    case 'INVALID_RESET_TOKEN':
      return 'El link ya no sirve. Pedí uno nuevo desde "Restablecer contraseña".';
    case 'RATE_LIMIT_EXCEEDED':
      return 'Demasiados intentos. Esperá un momento.';
    case 'VALIDATION_ERROR':
      return 'Revisá los datos del formulario.';
    default:
      return 'Algo salió mal. Intentá de nuevo.';
  }
}

// S25.3 — destino del link del mail de reset. El éxito manda a /login: el server revocó todas
// las sesiones (D3), así que no hay sesión que retomar.
export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const [token] = useState(() => searchParams.get('token'));
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const navigate = useNavigate();
  const toast = useToast();
  const { mutate, isPending } = useResetPassword();

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) return;
    if (password !== confirm) {
      toast.error('Las contraseñas no coinciden.');
      return;
    }
    mutate(
      { token, newPassword: password },
      {
        onSuccess: () => {
          toast.success('Contraseña actualizada. Iniciá sesión de nuevo.');
          navigate('/login', { replace: true });
        },
        onError: (error) => toast.error(resetErrorMessage(error)),
      },
    );
  };

  if (!token) {
    return (
      <div className="flex min-h-svh items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <div className="flex flex-col gap-4 text-center">
            <h1 className="text-2xl font-semibold text-ink">Restablecer contraseña</h1>
            <p className="text-sm text-body" role="alert">
              El link no es válido.
            </p>
            <Link to="/forgot-password" className="text-sm text-brand">
              Pedir un link nuevo
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <h1 className="text-2xl font-semibold text-ink">Elegí una contraseña nueva</h1>

          <Input
            label="Contraseña nueva"
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            disabled={isPending}
          />

          <Input
            label="Repetila"
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            disabled={isPending}
          />

          <Button type="submit" loading={isPending} className="mt-2">
            {isPending ? 'Guardando...' : 'Guardar contraseña'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
