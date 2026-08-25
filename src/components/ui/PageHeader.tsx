import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeftIcon } from './icons';

type PageHeaderProps = {
  title: string;
  /** Bajada corta debajo del título. */
  description?: ReactNode;
  /** Link "volver" arriba del título (ej: ‹ Cuenta). */
  backTo?: { to: string; label: string };
  /** Acciones de la página: a la derecha del título; en pantallas angostas wrappean debajo. */
  actions?: ReactNode;
};

// Header de página del design system: título a la izquierda, acciones a la derecha.
// Reemplaza los <h1> sueltos + botones dispersos (arriba-izquierda en unas páginas, ancho
// completo en otras, al pie en Cuentas) por un único patrón para toda la app.
export function PageHeader({ title, description, backTo, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-1">
      {backTo && (
        <Link
          to={backTo.to}
          className="flex items-center gap-1 self-start text-sm text-muted transition-colors duration-200 ease-out hover:text-ink"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          {backTo.label}
        </Link>
      )}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h1 className="text-2xl font-semibold text-ink">{title}</h1>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {description && <p className="text-sm text-muted">{description}</p>}
    </header>
  );
}
