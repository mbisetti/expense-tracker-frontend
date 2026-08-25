import { NavLink } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { ChevronDownIcon } from '../../components/ui/icons';
import { ExportSection } from '../export/ExportSection';
import { ImportSection } from '../import/ImportSection';
import { PeopleSection } from '../shared/PeopleSection';

const ROW_CLASS =
  'flex min-h-11 items-center justify-between gap-3 rounded-sm px-3 text-ink transition-colors duration-200 ease-out hover:bg-brand-bg';

// "Datos" — primera entrada del menú de la persona. Agrupa Categorías y Métodos de pago,
// que salieron del nav principal (Sprint 21). Ajustes/preferencias viven aparte en /settings.
export function DataPage() {
  return (
    <section className="flex flex-col gap-4 text-left">
      <PageHeader title="Datos" />

      <Card>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold text-ink">Categorías y métodos de pago</h2>
            <span className="text-sm text-muted">Administrá cómo clasificás y pagás tus movimientos.</span>
          </div>
          <nav className="flex flex-col divide-y divide-line" aria-label="Datos">
            <NavLink to="/categories" className={ROW_CLASS}>
              Categorías
              <ChevronDownIcon className="h-4 w-4 -rotate-90 text-muted" />
            </NavLink>
            <NavLink to="/payment-methods" className={ROW_CLASS}>
              Métodos de pago
              <ChevronDownIcon className="h-4 w-4 -rotate-90 text-muted" />
            </NavLink>
          </nav>
        </div>
      </Card>

      {/* V36: las personas de "Hoy por vos, mañana por mí" — mismo estatus que categorías. */}
      <PeopleSection />

      {/* Sprint 26: exportación de reportes .xlsx (dump por dataset). */}
      <ExportSection />

      {/* Import batch: plantilla + subida con preview + historial con deshacer. */}
      <ImportSection />
    </section>
  );
}
