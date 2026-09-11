import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CurrencyTabs } from '../dashboard/CurrencyTabs';
import { Amount } from '../../components/ui/Amount';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { useMe } from '../auth/useMe';
import { formatMoney } from '../../lib/money';
import { useExpensesSummary } from './useExpensesSummary';
import { PeriodNav } from './PeriodNav';
import { CategoryBreakdown } from './CategoryBreakdown';
import { RecurringSection } from './RecurringSection';
import { InsightsSection } from './InsightsSection';
import { CategoryTransactionsModal } from './CategoryTransactionsModal';
import { Section } from './Section';
import { SectionNav, type SectionLink } from './SectionNav';
import { useSectionsOpen } from './useSectionsOpen';
import { ReservedText } from '../../components/ui/ReservedText';
import { Switch } from '../../components/ui/Switch';
import { useInflationAdjust } from '../../lib/useInflationAdjust';
import { ipcMonthLabel } from '../../lib/quoteLabel';
import { SharedSection } from '../shared/SharedSection';
import { OwedSection } from '../shared/OwedSection';
import { useSharedSummary, usePersonDebts } from '../shared/useShared';
import { totalsByCurrency } from '../shared/api';
import { deltaVsPrev } from './format';
import { trimLeadingEmpty } from './insights';
import type { CategoryExpense, CurrencyExpenses } from './api';

// S29.1: la tab creció a 6 bloques — navegación in-page en vez de partirla en tabs nuevas
// (el split renace cuando los insights tengan IA; ver s29.1-gastos-navegacion-spec.md).
// Defaults: el análisis del mes abierto, el resto colapsado CON su dato clave en el header.
const SECTION_DEFAULTS: Record<string, boolean> = {
  categorias: true,
  evolucion: true,
  recurrentes: false,
  compartidos: false,
  recortar: false,
};

const SECTION_LINKS: SectionLink[] = [
  { id: 'categorias', label: 'Categorías' },
  { id: 'evolucion', label: 'Evolución' },
  { id: 'recurrentes', label: 'Recurrentes' },
  { id: 'compartidos', label: 'Compartidos' },
  { id: 'recortar', label: 'Recortar' },
];

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

// Recharts lazy (patrón MonthlyChart): no engordar el bundle inicial.
const EssentialTrendChart = lazy(() =>
  import('./EssentialTrendChart').then((m) => ({ default: m.EssentialTrendChart })),
);

function currentPeriod(): { year: number; month: number } {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

// Resumen del mes: total (Amount lg) + delta vs mes anterior + split esencial/no esencial
// (montos, % y barra de dos segmentos). Markup local, no hace falta un componente genérico.
function MonthSummary({
  data,
  ipcAsOf,
  unadjustedMonths,
}: {
  data: CurrencyExpenses;
  /** S49: mes base de los pesos constantes, "YYYY-MM". null = los montos son nominales. */
  ipcAsOf?: string | null;
  unadjustedMonths?: number;
}) {
  const delta = deltaVsPrev(data.total, data.prevMonthTotal);
  const base = ipcMonthLabel(ipcAsOf);
  const essentialPct = data.total > 0 ? Math.round((data.essentialTotal / data.total) * 100) : 0;
  const nonEssentialPct = data.total > 0 ? 100 - essentialPct : 0;

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-sm text-muted">Gastado este mes</span>
          <Amount amount={data.total} currency={data.currency} tone="neutral" size="xl" />
        </div>
        {delta.direction !== 'flat' && (
          <span
            className={
              delta.direction === 'up' || delta.direction === 'new' ? 'text-expense' : 'text-income'
            }
          >
            {delta.direction === 'up' ? '↑' : delta.direction === 'down' ? '↓' : ''} {delta.text}{' '}
            <span className="text-muted">vs mes anterior</span>
          </span>
        )}
      </div>

      {/* Proyección MTD (S24.2 E): solo en el mes corriente (el backend manda projectedTotal
          únicamente ahí). "A este ritmo…" + comparación con el mes pasado si aplica. */}
      {data.projectedTotal != null && (
        <p className="text-sm text-body">
          A este ritmo terminás el mes en{' '}
          <span className="tabular-nums text-ink">
            ~{formatMoney(data.projectedTotal, data.currency)}
          </span>
          {data.prevMonthTotal > 0 && (
            <>
              {' '}
              <span className="text-muted">
                (el mes pasado: {formatMoney(data.prevMonthTotal, data.currency)})
              </span>
            </>
          )}
        </p>
      )}

      {/* S49 (D5): con el ajuste puesto, la pantalla dice en pesos de qué mes está hablando.
          Y si algún mes de la ventana quedó nominal por no haber IPC tan atrás, lo dice también:
          un promedio con un mes sin ajustar no es del todo comparable. */}
      {base && (
        <p className="text-xs text-muted">
          {`En pesos de ${base}, según el IPC del INDEC.` +
            (unadjustedMonths && unadjustedMonths > 0
              ? ` ${unadjustedMonths} ${unadjustedMonths === 1 ? 'mes quedó' : 'meses quedaron'} sin ajustar: no hay IPC tan atrás.`
              : '')}
        </p>
      )}

      {data.total > 0 && (
        <div className="flex flex-col gap-1.5">
          {/* S24.2 A.1: esencial = ink (el "negro" temático), no esencial = ámbar. Ni rojo
              (atado a "malo") ni verde (es ingreso). */}
          <div className="flex h-2 overflow-hidden rounded-full bg-surface-sunken">
            <div className="h-2 bg-ink" style={{ width: `${essentialPct}%` }} />
            <div className="h-2 bg-warning" style={{ width: `${nonEssentialPct}%` }} />
          </div>
          <div className="flex justify-between text-sm text-body">
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-ink" />
              Esencial{' '}
              <span className="text-muted">
                {formatMoney(data.essentialTotal, data.currency)} · {essentialPct}%
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-warning" />
              No esencial{' '}
              <span className="text-muted">
                {formatMoney(data.nonEssentialTotal, data.currency)} · {nonEssentialPct}%
              </span>
            </span>
          </div>
        </div>
      )}
    </section>
  );
}

export function ExpensesPage() {
  const [period, setPeriod] = useState(currentPeriod);
  const [picked, setPicked] = useState<string | null>(null);
  const [drill, setDrill] = useState<CategoryExpense | null>(null);

  const { data: me } = useMe();
  // S49 (D11): el mismo toggle que el Dashboard, guardado en localStorage.
  const [inflationAdjusted, setInflationAdjusted] = useInflationAdjust();
  const { data, isPending, isError } = useExpensesSummary(
    period.year,
    period.month,
    inflationAdjusted,
  );
  // Hoisteado de SharedSection (React Query dedupea): la página decide si la sección existe
  // y arma su resumen colapsado; el componente adentro consume la misma cache.
  const { data: shared } = useSharedSummary();
  // S40: mismo hoisteo que el de arriba y por la misma razón — el header de la sección necesita
  // el total de lo que DEBÉS sin abrirla. React Query dedupea con el fetch de OwedSection.
  const { data: owed } = usePersonDebts();
  const sections = useSectionsOpen(SECTION_DEFAULTS);

  // Deep-link por hash (#recurrentes, #compartidos): lo manda el centro de notificaciones.
  // useSectionsOpen lo resuelve al MONTAR, que alcanza si venías de otra pantalla. Estando ya
  // parado en Gastos no se monta nada, así que el tap cambiaba la URL y no abría la sección.
  //
  // `location.key` cambia en CADA navegación, incluso hacia la URL en la que ya estás: es lo
  // que distingue "tocó la notificación otra vez" de un re-render cualquiera. Los links de
  // sección de la página usan history.replaceState y no pasan por el router, así que navegar la
  // página a mano no dispara nada de esto.
  const location = useLocation();
  const [navKey, setNavKey] = useState(location.key);
  if (location.key !== navKey) {
    setNavKey(location.key);
    const target = location.hash.slice(1);
    if (target && target in SECTION_DEFAULTS) sections.open(target);
  }

  // El scroll sí es un efecto (toca el DOM), y se hace una vez por navegación: sin el ref,
  // cualquier refetch del resumen volvería a saltar a la sección del hash.
  const scrolledForKey = useRef<string | null>(null);

  const goTo = (id: string) => {
    sections.open(id);
    history.replaceState(null, '', `#${id}`);
    // rAF: el body de una sección colapsada recién se monta en el próximo render.
    requestAnimationFrame(() =>
      document.getElementById(id)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }),
    );
  };

  // Deep-link (#recurrentes): la apertura la resolvió el ajuste de arriba (o, al montar, el
  // initial state de useSectionsOpen); acá solo el scroll, una vez que hay datos renderizados.
  // Sin setState (regla del repo).
  useEffect(() => {
    if (!data || scrolledForKey.current === location.key) return;
    scrolledForKey.current = location.key;
    const id = location.hash.slice(1);
    if (id && id in SECTION_DEFAULTS) {
      requestAnimationFrame(() =>
        document.getElementById(id)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }),
      );
    }
  }, [data, location.key, location.hash]);

  const now = currentPeriod();
  const canGoNext = period.year < now.year || (period.year === now.year && period.month < now.month);

  const goPrev = () => {
    setDrill(null);
    setPeriod((p) => (p.month === 1 ? { year: p.year - 1, month: 12 } : { ...p, month: p.month - 1 }));
  };
  const goNext = () => {
    if (!canGoNext) return;
    setDrill(null);
    setPeriod((p) => (p.month === 12 ? { year: p.year + 1, month: 1 } : { ...p, month: p.month + 1 }));
  };

  // Resúmenes colapsados (S29.1): el dato clave de cada sección visible sin abrirla.
  // S40 (D8): el header de compartidos ahora tiene DOS números, uno por dirección — "Te deben
  // $X · Debés $Y". Que convivan es el punto: colapsada, la sección dice cómo estás en total.
  const sharedTotals = totalsByCurrency((shared?.people ?? []).map((p) => p.pending));
  const owedTotals = totalsByCurrency((owed?.people ?? []).map((p) => p.owed));
  const money = (totals: Map<string, number>) =>
    [...totals.entries()].map(([cur, amount]) => formatMoney(amount, cur)).join(' · ');

  const sharedSummaryParts = [
    sharedTotals.size > 0 ? `Te deben ${money(sharedTotals)}` : null,
    owedTotals.size > 0 ? `Debés ${money(owedTotals)}` : null,
  ].filter(Boolean);
  const sharedSummary =
    sharedSummaryParts.length > 0 ? sharedSummaryParts.join(' · ') : 'Nadie te debe, no debés nada';

  // Compartidos ahora siempre está (chip + sección): sin deudas muestra un empty state con CTA
  // para repartir un gasto — así se ve que no hay nada que cobrar y hay por dónde empezar.
  const navLinks = SECTION_LINKS;

  const currencies = data?.byCurrency.map((c) => c.currency) ?? [];
  // Moneda activa sin useEffect: la elegida si sigue existiendo; si no, la favorita; si no, la
  // primera. Al navegar meses, si la elegida desaparece, cae sola al fallback.
  const active =
    picked && currencies.includes(picked)
      ? picked
      : me?.defaultCurrency && currencies.includes(me.defaultCurrency)
        ? me.defaultCurrency
        : (currencies[0] ?? '');
  const current = data?.byCurrency.find((c) => c.currency === active);

  // S49 (D5/D12): el switch existe sólo con la pestaña ARS activa. Sin IPC en la tabla se
  // muestra deshabilitado y explica por qué, en vez de desaparecer sin decir nada. Y la posición
  // nunca queda prendida sin datos: ahí mentiría sobre lo que se está viendo.
  const ipcAvailable = data?.ipcAsOf != null;
  const showAdjust = !!data && active === 'ARS';
  const adjustEnabled = inflationAdjusted && ipcAvailable;
  const ipcBaseLabel = ipcMonthLabel(data?.ipcAsOf);
  // `enabled` entra por parámetro para poder pedir las DOS versiones del texto auxiliar: la
  // vigente y la del switch prendido, que es la más larga y la que le reserva el lugar.
  const adjustHelper = (enabled: boolean) =>
    !ipcAvailable
      ? 'Todavía no hay datos del IPC.'
      : enabled && ipcBaseLabel
        ? `Montos en pesos de ${ipcBaseLabel}, según el IPC del INDEC.`
        : 'Montos tal como los anotaste.';

  const recurring = current?.recurring;
  const pendingRecurring =
    recurring?.items.filter((i) => i.state === 'PENDING' || i.state === 'PARTIAL').length ?? 0;
  const recurringSummary =
    current && recurring && recurring.items.length > 0
      ? `${formatMoney(recurring.committedTotal, current.currency)} comprometido` +
        (pendingRecurring > 0
          ? ` · ${pendingRecurring} pendiente${pendingRecurring === 1 ? '' : 's'}`
          : '')
      : undefined;

  return (
    <section className="flex flex-col gap-4 text-left">
      <PageHeader
        title="Gastos"
        actions={
          <PeriodNav
            year={period.year}
            month={period.month}
            onPrev={goPrev}
            onNext={goNext}
            canGoNext={canGoNext}
          />
        }
      />

      {/* S49 (D12): el switch al lado de las pestañas de moneda, porque el parámetro ajusta la
          página ENTERA (categorías, evolución, recortar) y no un bloque suelto. Sólo con ARS
          activa: pesos constantes es para pesos. flex-wrap para que en pantallas angostas caiga
          debajo de las pestañas en vez de apretarlas.

          El bloque del switch lleva ancho fijo y su texto auxiliar va envuelto en ReservedText,
          igual que en el encabezado del gráfico del Dashboard y por el mismo motivo: ese texto pasa
          a una versión más larga al prender el ajuste, y con el tamaño atado al contenido el toggle
          se corría y la fila empujaba todo lo de abajo. */}
      {(currencies.length > 1 || showAdjust) && (
        <div className="flex flex-wrap items-start justify-between gap-2">
          {currencies.length > 1 && (
            <CurrencyTabs currencies={currencies} selected={active} onSelect={setPicked} />
          )}
          {showAdjust && (
            <div className="w-full shrink-0 sm:w-72">
              <Switch
                id="expenses-inflation-adjust"
                label="Ajustar por inflación"
                checked={adjustEnabled}
                disabled={!ipcAvailable}
                helper={
                  <ReservedText longest={adjustHelper(true)}>
                    {adjustHelper(adjustEnabled)}
                  </ReservedText>
                }
                onChange={setInflationAdjusted}
              />
            </div>
          )}
        </div>
      )}

      {isPending && <Skeleton variant="card" />}

      {isError && (
        <p role="alert" className="text-expense">
          No pudimos cargar los gastos. Intentá de nuevo.
        </p>
      )}

      {!isPending && !isError && currencies.length === 0 && (
        <EmptyState title="No hay gastos en este período." />
      )}

      {current && (
        <>
          <MonthSummary
            data={current}
            ipcAsOf={data?.constant ? data.ipcAsOf : null}
            unadjustedMonths={data?.unadjustedMonths}
          />
          <SectionNav sections={navLinks} onGo={goTo} />

          <Section
            id="categorias"
            title="Por categoría"
            open={sections.isOpen('categorias')}
            onToggle={() => sections.toggle('categorias')}
            summary={`${current.byCategory.length} categoría${current.byCategory.length === 1 ? '' : 's'}`}
          >
            {/* key por mes+moneda: resetea el triple toggle y "Ver todos" al navegar (S24.2 B). */}
            {/* S49: `constant` entra en el key. Cambiar de base cambia todos los montos, y el
                triple toggle y el "Ver todos" locales tienen que arrancar limpios. */}
            <CategoryBreakdown
              key={`${monthKey(period.year, period.month)}-${active}-${data?.constant ?? false}`}
              data={current}
              onDrill={setDrill}
            />
          </Section>

          <Section
            id="evolucion"
            title="Evolución"
            open={sections.isOpen('evolucion')}
            onToggle={() => sections.toggle('evolucion')}
            summary="últimos 6 meses"
          >
            <p className="text-sm text-body">Esencial vs no esencial, últimos 6 meses</p>
            <Suspense fallback={<Skeleton variant="chart" />}>
              {/* S24.2 (C): sin meses fantasma al inicio + mes seleccionado resaltado. */}
              <EssentialTrendChart
                months={trimLeadingEmpty(current.months)}
                currency={current.currency}
                selectedMonth={monthKey(period.year, period.month)}
              />
            </Suspense>
          </Section>

          <Section
            id="recurrentes"
            title="Gastos recurrentes"
            open={sections.isOpen('recurrentes')}
            onToggle={() => sections.toggle('recurrentes')}
            summary={recurringSummary}
          >
            <RecurringSection data={current} year={period.year} month={period.month} />
          </Section>

          {/* V36 (D5): acumulado, indiferente al mes seleccionado — la deuda no es mensual.
              Siempre presente: con deudas resume "Te deben…", sin deudas "Nadie te debe" y adentro
              un empty state con CTA para repartir un gasto. */}
          <Section
            id="compartidos"
            title="Hoy por vos, mañana por mí"
            open={sections.isOpen('compartidos')}
            onToggle={() => sections.toggle('compartidos')}
            summary={sharedSummary}
          >
            {/* S40 (D8): los dos lados del mostrador, uno debajo del otro. Hermanos y no
                anidados: cada uno tiene su propio empty state y su propio estado de carga. */}
            <SharedSection />
            <OwedSection />
          </Section>

          <Section
            id="recortar"
            title="Dónde recortar"
            open={sections.isOpen('recortar')}
            onToggle={() => sections.toggle('recortar')}
          >
            <InsightsSection
              data={current}
              months={trimLeadingEmpty(current.months)}
              selectedMonth={monthKey(period.year, period.month)}
            />
          </Section>
        </>
      )}

      {drill && current && (
        <CategoryTransactionsModal
          category={drill}
          currency={current.currency}
          year={period.year}
          month={period.month}
          onClose={() => setDrill(null)}
        />
      )}
    </section>
  );
}
