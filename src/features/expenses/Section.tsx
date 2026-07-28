import type { ReactNode } from 'react';
import { ChevronDownIcon } from '../../components/ui/icons';

type SectionProps = {
  /** Ancla del hash (#id), id del body para aria-controls y clave de persistencia. */
  id: string;
  title: string;
  open: boolean;
  onToggle: () => void;
  /** Dato clave visible COLAPSADA (a la derecha, muted) — la sección informa sin abrirse. */
  summary?: ReactNode;
  children: ReactNode;
};

// S29.1: card colapsable de la tab Gastos — unifica el chrome que antes traía cada sección.
// Patrón disclosure con el botón DENTRO del h2: el heading conserva su nombre accesible
// (lectores de pantalla y getByRole('heading') ven lo mismo que antes). El body no se monta
// colapsado — el chart lazy de Evolución no carga si nadie lo abre.
export function Section({ id, title, open, onToggle, summary, children }: SectionProps) {
  return (
    <section
      id={id}
      className="flex scroll-mt-20 flex-col gap-3 rounded-xl border border-line bg-surface p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="min-w-0">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-controls={`${id}-body`}
            className="flex items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            {title}
            <ChevronDownIcon
              aria-hidden="true"
              className={`h-4 w-4 shrink-0 text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            />
          </button>
        </h2>
        {!open && summary && <span className="truncate text-sm text-muted">{summary}</span>}
      </div>

      {open && (
        <div id={`${id}-body`} className="flex flex-col gap-3">
          {children}
        </div>
      )}
    </section>
  );
}
