import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { useToast } from '../../components/ui/toastContext';
import { useTheme } from '../../lib/useTheme';
import { useDateFormat, type DateFormatPref } from '../../lib/dateFormat';
import { useCalendar, type CalendarPref } from '../../lib/useCalendar';
import { useMe, useUpdateMe } from '../auth/useMe';
import { NotificationsSection } from '../notifications/NotificationsSection';
import { InstallSection } from './InstallSection';
import { WorkingCurrenciesSection } from './WorkingCurrenciesSection';
import { MoonIcon, SunIcon } from '../../components/ui/icons';

// Moneda favorita: opciones curadas (Sprint 22.1). Si el usuario tuviera otra guardada,
// se agrega al principio para no perderla del selector.
const FAV_CURRENCIES = ['ARS', 'USD', 'EUR'];
const CURRENCY_LABEL: Record<string, string> = {
  ARS: 'Peso argentino (ARS)',
  USD: 'Dólar (USD)',
  EUR: 'Euro (EUR)',
};

// S25.4 (D8): el sidebar navega por anclas. La lista es estática a propósito: si una sección
// se oculta sola (InstallSection instalada), el click simplemente no scrollea — sin sorpresas.
const SECTIONS = [
  { id: 'preferencias', label: 'Preferencias' },
  { id: 'instalacion', label: 'Instalar la app' },
  { id: 'notificaciones', label: 'Notificaciones' },
];

// "Ajustes y preferencias" — preferencias de la app y nada más desde S25.4: el email, la
// contraseña, los conectores y el borrado viven en la página Cuenta (D7).
export function SettingsPage() {
  const { theme, toggle: toggleTheme } = useTheme();
  const { pref: dateFmt, set: setDateFmt } = useDateFormat();
  const { calendar, set: setCalendar } = useCalendar();

  const { data: me } = useMe();
  const updateMe = useUpdateMe();
  const toast = useToast();

  const favCurrencyOptions =
    me && !FAV_CURRENCIES.includes(me.defaultCurrency)
      ? [me.defaultCurrency, ...FAV_CURRENCIES]
      : FAV_CURRENCIES;

  const changeFavCurrency = (defaultCurrency: string) => {
    updateMe.mutate(
      { defaultCurrency },
      {
        onSuccess: () => toast.success('Moneda favorita actualizada.'),
        onError: () => toast.error('No se pudo actualizar la moneda favorita.'),
      },
    );
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section className="text-left lg:grid lg:grid-cols-[190px_1fr] lg:items-start lg:gap-6">
      {/* D8: sidebar estático (solo desktop) — el contenido scrollea, esto queda quieto. */}
      <aside className="hidden lg:block">
        <nav
          aria-label="Secciones de ajustes"
          className="sticky top-24 flex flex-col gap-1 rounded-md border border-line bg-surface-elevated p-2"
        >
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => scrollToSection(s.id)}
              className="flex min-h-11 items-center rounded-sm px-3 text-left text-sm text-ink transition-colors duration-200 ease-out hover:bg-brand-bg"
            >
              {s.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex flex-col gap-4">
        <h1>Ajustes y preferencias</h1>

        {/* scroll-mt: que el ancla no quede tapada por el header sticky. */}
        <div id="preferencias" className="scroll-mt-24">
          <Card>
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-ink">Preferencias</h2>

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
                label="Moneda favorita"
                id="favorite-currency"
                value={me?.defaultCurrency ?? ''}
                disabled={!me || updateMe.isPending}
                onChange={(e) => changeFavCurrency(e.target.value)}
                helper="Se usa para el total consolidado y para estimar equivalencias de otras monedas."
              >
                {favCurrencyOptions.map((c) => (
                  <option key={c} value={c}>
                    {CURRENCY_LABEL[c] ?? c}
                  </option>
                ))}
              </Select>

              {/* S27.1: va justo debajo de la favorita — son la misma familia de preferencia (con
                  qué monedas hablás), y leerlas juntas hace evidente que una es la de referencia y
                  las otras las de trabajo. */}
              <WorkingCurrenciesSection />

              <Select
                label="Formato de fecha"
                id="date-format"
                value={dateFmt}
                onChange={(e) => setDateFmt(e.target.value as DateFormatPref)}
                helper="Cómo se muestran las fechas en la app."
              >
                <option value="ar">DD/MM/AAAA</option>
                <option value="us">MM/DD/AAAA</option>
              </Select>

              <Select
                label="Calendario"
                id="calendar"
                value={calendar}
                onChange={(e) => setCalendar(e.target.value as CalendarPref)}
                helper="Feriados que se usan para calcular los días hábiles."
              >
                <option value="AR">Argentina</option>
                <option value="US">Estados Unidos</option>
              </Select>
            </div>
          </Card>
        </div>

        {/* S35: instalar la PWA. Se oculta sola si ya está instalada o si el browser no sabe. */}
        <div id="instalacion" className="scroll-mt-24">
          <InstallSection />
        </div>

        {/* S34: qué notificaciones recibir y por qué canal. */}
        <div id="notificaciones" className="scroll-mt-24">
          <NotificationsSection />
        </div>
      </div>
    </section>
  );
}
