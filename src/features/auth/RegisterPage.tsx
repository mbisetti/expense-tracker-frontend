import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useRegister } from './useRegister';

export function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { mutate, isPending, isError, error } = useRegister();

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    mutate({ name, email, password });
  };

  const errorMessage = (() => {
    if (!isError || !error) return null;
    switch (error.code) {
      case 'EMAIL_ALREADY_EXISTS': return 'Ese email ya está registrado.';
      case 'VALIDATION_ERROR': return 'Revisá los datos del formulario.';
      case 'RATE_LIMIT_EXCEEDED': return 'Demasiados intentos. Esperá un momento.';
      default: return 'Algo salió mal. Intentá de nuevo.';
    }
  })();

  return (
    <form onSubmit={handleSubmit}>
      <h1>Crear cuenta</h1>

      <label htmlFor="name">Nombre</label>
      <input
        id="name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        disabled={isPending}
      />

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
        {isPending ? 'Creando cuenta...' : 'Crear cuenta'}
      </button>

      <p>
        ¿Ya tenés cuenta? <Link to="/login">Iniciá sesión</Link>
      </p>
    </form>
  );
}
