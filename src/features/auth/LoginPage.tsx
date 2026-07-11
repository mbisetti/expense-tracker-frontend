import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLogin } from './useLogin';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const location = useLocation();
  const { mutate, isPending, isError, error } = useLogin();

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    mutate({ email, password });
  };

  const errorMessage = (() => {
    if (!isError || !error) return null;
    switch (error.code) {
      case 'INVALID_CREDENTIALS': return 'Email o contraseña incorrectos.';
      case 'RATE_LIMIT_EXCEEDED': return 'Demasiados intentos. Esperá un momento.';
      case 'VALIDATION_ERROR': return 'Revisá los datos del formulario.';
      default: return 'Algo salió mal. Intentá de nuevo.';
    }
  })();

  return (
    <form onSubmit={handleSubmit}>
      <h1>Iniciar sesión</h1>

      <label htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        disabled={isPending}
      />

      <label htmlFor="password">Contraseña</label>
      <input
        id="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={8}
        disabled={isPending}
      />

      {errorMessage && <p role="alert">{errorMessage}</p>}

      <button type="submit" disabled={isPending}>
        {isPending ? 'Ingresando...' : 'Ingresar'}
      </button>

      <p>
        ¿No tenés cuenta?{' '}
        <Link to="/register" state={location.state}>
          Registrate
        </Link>
      </p>
    </form>
  );
}
