import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { Select } from '../../components/ui/Select';
import { useToast } from '../../components/ui/toastContext';
import { useTheme } from '../../lib/useTheme';
import { useDateFormat, type DateFormatPref } from '../../lib/dateFormat';
import { useCalendar, type CalendarPref } from '../../lib/useCalendar';
import { useMe, useUpdateMe } from '../auth/useMe';
import { NotificationsSection } from '../notifications/NotificationsSection';
import { InstallSection } from './InstallSection';
import { WorkingCurrenciesSection } from './WorkingCurrenciesSection';
import { useLatestIndexes } from './useLatestIndexes';
import type { ArsQuote } from '../../lib/quoteLabel';
import { MoonIcon, SunIcon } from '../../components/ui/icons';

// Moneda favorita: opciones curadas (Sprint 22.1). Si el usuario tuviera otra guardada,
// se agrega al principio para no perderla del selector.
const FAV_CURRENCIES = ['ARS', 'USD', 'EUR'];
const CURRENCY_LABEL: Record<string, string> = {
  ARS: 'Peso argentino (ARS)',
  USD: 'Dólar (USD)',
  EUR: 'Euro (EUR)',
};

// S49 (D3/D12): las tres casas del dólar, en el orden en que conviene ofrecerlas. El MEP
// primero porque es el default y el que se compra legal a precio de mercado.
const ARS_QUOTES: ArsQuote[] = ['MEP', 'BLUE', 'OFICIAL'];
const ARS_QUOTE_LABEL: Record<ArsQuote, string> = {
  MEP: 'MEP (dólar bolsa)',
  BLUE: 'Blue',
  OFICIAL: 'Oficial',
};
// En la línea "Hoy:" van las tres juntas, así que el nombre corto: "MEP $1.533 · Blue $1.540 ·
// Oficial $1.535" se lee de un saque, con la aclaración entre paréntesis no.
const ARS_QUOTE_SHORT: Record<ArsQuote, string> = {
  MEP: 'MEP',
  BLUE: 'Blue',
  OFICIAL: 'Oficial',
};
// Sin centavos: una cotización de referencia con dos decimales no se lee mejor, se lee peor.
const QUOTE_FMT = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

// "Ajustes y preferencias" — preferencias de la app y nada más desde S25.4: el email, la
// contraseña, los conectores y el borrado viven en la página Cuenta (D7).
export function SettingsPage() {
  const { theme, toggle: toggleTheme } = useTheme();
  const { pref: dateFmt, set: setDateFmt } = useDateFormat();
  const { calendar, set: setCalendar } = useCalendar();

  const { data: me } = useMe();
  const updateMe = useUpdateMe();
  const toast = useToast();
  // S49: cuánto está cada dólar hoy, para poner el número al lado de la opción. Si el job
  // todavía no corrió viene todo en null y la línea "Hoy:" simplemente no aparece.
  const { data: indexes } = useLatestIndexes();

  const quoteValue = (quote: ArsQuote): number | null => indexes?.usd?.[quote]?.sell ?? null;

  // Una sola línea con las tres, armada como UN string: partirla en JSX serían varios nodos de
  // texto y la frase dejaría de existir como tal (lección S47).
  const todayLine = (() => {
    const parts = ARS_QUOTES.map((quote) => {
      const value = quoteValue(quote);
      return value == null ? null : `${ARS_QUOTE_SHORT[quote]} ${QUOTE_FMT.format(value)}`;
    }).filter(Boolean);
    return parts.length > 0 ? `Hoy: ${parts.join(' · ')}` : null;
  })();

  const changeArsQuote = (arsQuote: string) => {
    updateMe.mutate(
      { arsQuote: arsQuote as ArsQuote },
      {
        onSuccess: () => toast.success('Cotización guardada.'),
        onError: () => toast.error('No pudimos guardar la cotización. Intentá de nuevo.'),
      },
    );
  };

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

  return (
    <section className="flex flex-col gap-4 text-left">
      <PageHeader title="Ajustes y preferencias" />

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

              {/* S49 (D12): la tercera de la misma familia. Con qué dólar habla la app. */}
              <Select
                label="Cotización del dólar"
                id="ars-quote"
                value={me?.arsQuote ?? ''}
                disabled={!me || updateMe.isPending}
                onChange={(e) => changeArsQuote(e.target.value)}
                helper={
                  todayLine
                    ? `Se usa para sugerir conversiones entre pesos y dólares y para el total consolidado. Nunca cambia lo que ya anotaste. ${todayLine}`
                    : 'Se usa para sugerir conversiones entre pesos y dólares y para el total consolidado. Nunca cambia lo que ya anotaste.'
                }
              >
                {ARS_QUOTES.map((quote) => {
                  const value = quoteValue(quote);
                  return (
                    <option key={quote} value={quote}>
                      {value == null
                        ? ARS_QUOTE_LABEL[quote]
                        : `${ARS_QUOTE_LABEL[quote]} · ${QUOTE_FMT.format(value)}`}
                    </option>
                  );
                })}
              </Select>

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

      {/* S35: instalar la PWA. Se oculta sola si ya está instalada o si el browser no sabe. */}
      <InstallSection />

      {/* S34: qué notificaciones recibir y por qué canal. */}
      <NotificationsSection />
    </section>
  );
}
