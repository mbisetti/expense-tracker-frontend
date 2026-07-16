import { NavLink } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { useTheme } from '../../lib/useTheme';
import { useDateFormat, type DateFormatPref } from '../../lib/dateFormat';
import { ChevronDownIcon, MoonIcon, SunIcon } from '../../components/ui/icons';

const ROW_CLASS =
  'flex min-h-11 items-center justify-between gap-3 rounded-sm px-3 text-ink transition-colors duration-200 ease-out hover:bg-brand-bg';

// Ajustes y preferencias de la cuenta: engloba tema, categorías y métodos de pago
// (que salieron del nav principal). Se llega desde el menú de la persona en el header.
export function SettingsPage() {
  const { theme, toggle: toggleTheme } = useTheme();
  const { pref: dateFmt, set: setDateFmt } = useDateFormat();

  return (
    <section className="flex flex-col gap-4 text-left">
      <h1>Ajustes</h1>

      <Card>
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-ink">Apariencia y preferencias</h2>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-ink">Tema</span>
              <span className="text-sm text-muted">
                Actualmente: {theme === 'dark' ? 'oscuro' : 'claro'}
              </span>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={toggleTheme}
              leftIcon={theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            >
              {theme === 'dark' ? 'Cambiar a claro' : 'Cambiar a oscuro'}
            </Button>
          </div>

          <Select
            label="Formato de fecha"
            id="date-format"
            value={dateFmt}
            onChange={(e) => setDateFmt(e.target.value as DateFormatPref)}
            helper="Argentina usa DD/MM/AAAA. También ordena los filtros por fecha."
          >
            <option value="ar">Normal — DD/MM/AAAA</option>
            <option value="us">Yankee — MM/DD/AAAA</option>
          </Select>
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold text-ink">Datos</h2>
            <span className="text-sm text-muted">Categorías y métodos de pago.</span>
          </div>
          <nav className="flex flex-col divide-y divide-line" aria-label="Configuración de datos">
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
    </section>
  );
}
