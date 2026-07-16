import type { ReactNode, SVGProps } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Amount } from '../../components/ui/Amount';
import { Badge } from '../../components/ui/Badge';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { CheckCircleIcon } from '../../components/ui/icons';

// Landing pública (S19): SOLO components/ui/*, react-router `Link` e SVG inline. Nunca
// TanStack Query, hooks de datos (`use*` de features) ni el shell privado — así queda en
// su propio chunk (React.lazy en PublicHome) y el bundle anónimo se mantiene liviano.
// TODOS los datos de las previews son ficticios (nombre, montos, categorías) — nunca datos
// reales de usuario, la landing no hace fetch ni lee sesión.

// Clases de link-como-botón: mismas reglas visuales que components/ui/Button.tsx
// (variant="primary"/"secondary", tamaño lg/sm), pero como <Link> real (no <button>
// anidado dentro de <a>) para que el CTA de navegación sea un link accesible de verdad
// (click derecho, "abrir en pestaña nueva", etc.).
const PRIMARY_LINK_LG =
  'inline-flex h-14 items-center justify-center rounded-md bg-brand px-6 text-lg font-medium text-on-brand ' +
  'transition-colors duration-200 ease-out hover:bg-brand-hover ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2';
const SECONDARY_LINK_LG =
  'inline-flex h-14 items-center justify-center rounded-md border border-line bg-surface-elevated px-6 text-lg font-medium text-ink ' +
  'transition-colors duration-200 ease-out hover:bg-surface-sunken ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2';
const PRIMARY_LINK_SM =
  'inline-flex h-11 items-center justify-center rounded-md bg-brand px-4 text-sm font-medium text-on-brand ' +
  'transition-colors duration-200 ease-out hover:bg-brand-hover ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2';
const GHOST_LINK_SM =
  'inline-flex h-11 items-center justify-center rounded-md px-4 text-sm font-medium text-ink ' +
  'transition-colors duration-200 ease-out hover:bg-surface-sunken ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2';

function WordmarkIcon(props: SVGProps<SVGSVGElement>) {
  // Silueta simple estilo mango — decorativo, acompaña al texto "Manguitos" (nunca solo).
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable={false} {...props}>
      <path d="M8 3c3 0 8 2 8 9a7 7 0 0 1-7 7c-4 0-7-3-7-7C2 7 5 3 8 3Z" />
      <path d="M9 3c1-1.5 2.5-2 4-2" />
    </svg>
  );
}

function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2 text-lg font-semibold text-ink">
      <WordmarkIcon className="h-6 w-6 text-brand" />
      Manguitos
    </span>
  );
}

function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-xs rounded-lg border-4 border-line bg-surface-elevated p-3 shadow-lg">
      <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-line" aria-hidden="true" />
      <div className="rounded-md bg-surface p-3">{children}</div>
    </div>
  );
}

function HeroPreview() {
  return (
    <PhoneFrame>
      <Card className="text-left">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-muted">Hola, Sofía</p>
            <p className="text-sm font-medium text-ink">Balance total</p>
          </div>
          <Badge status="ok" label="Al día" />
        </div>
        <Amount amount={284350.2} currency="ARS" tone="neutral" size="xl" className="mt-2 block" />

        <div className="mt-5 flex flex-col gap-3">
          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-body">Supermercado</span>
              <span className="text-muted">62%</span>
            </div>
            <ProgressBar
              ratio={0.62}
              tone="brand"
              markerRatio={0.8}
              label="Presupuesto de supermercado"
              className="mt-1"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-body">Netflix</span>
            <Amount amount={-4200} currency="ARS" tone="expense" size="sm" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-body">Freelance</span>
            <Amount amount={95000} currency="ARS" tone="income" size="sm" />
          </div>
        </div>
      </Card>
    </PhoneFrame>
  );
}

function ExpensesPreview() {
  return (
    <Card className="text-left">
      <ul className="flex flex-col gap-3">
        <li className="flex items-center justify-between gap-3">
          <span className="text-sm text-body">Supermercado — Coto</span>
          <Amount amount={-18500} currency="ARS" tone="expense" size="sm" />
        </li>
        <li className="flex items-center justify-between gap-3">
          <span className="text-sm text-body">Sueldo</span>
          <Amount amount={450000} currency="ARS" tone="income" size="sm" />
        </li>
        <li className="flex items-center justify-between gap-3">
          <span className="text-sm text-body">Nafta — YPF</span>
          <Amount amount={-9200} currency="ARS" tone="expense" size="sm" />
        </li>
      </ul>
    </Card>
  );
}

function BudgetPreview() {
  return (
    <Card className="text-left">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium text-ink">Salidas / Ocio</span>
        <Badge status="warning" label="Cerca del límite" />
      </div>
      <ProgressBar
        ratio={0.78}
        tone="warning"
        markerRatio={0.95}
        label="Presupuesto de salidas"
        className="mt-3"
      />
      <p className="mt-2 text-xs text-muted">Proyección a fin de mes: 95% del presupuesto.</p>
    </Card>
  );
}

function MultiCurrencyPreview() {
  return (
    <Card className="text-left">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs text-muted">Cuenta en pesos</p>
          <Amount amount={132400} currency="ARS" tone="neutral" size="lg" />
        </div>
        <Badge status="info" label="Transferencia" />
      </div>
      <div className="mt-3 border-t border-line pt-3">
        <p className="text-xs text-muted">Cuenta en dólares</p>
        <Amount amount={310} currency="USD" tone="neutral" size="lg" />
      </div>
    </Card>
  );
}

function IncomePreview() {
  return (
    <Card className="text-left">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-body">Bruto</span>
        <Amount amount={520000} currency="ARS" tone="neutral" size="sm" />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-sm">
        <span className="text-body">Deducciones</span>
        <Amount amount={-78000} currency="ARS" tone="expense" size="sm" />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-line pt-2 text-sm font-medium">
        <span className="text-ink">Neto</span>
        <Amount amount={442000} currency="ARS" tone="income" size="sm" />
      </div>
    </Card>
  );
}

type Feature = {
  eyebrow: string;
  title: string;
  blurb: string;
  preview: ReactNode;
};

const FEATURES: Feature[] = [
  {
    eyebrow: 'Gastos',
    title: 'Controlá cada gasto, sin planillas',
    blurb: 'Registrá transacciones y organizalas por categoría. Vas a saber en qué se te va la plata, en serio.',
    preview: <ExpensesPreview />,
  },
  {
    eyebrow: 'Presupuestos',
    title: 'Presupuestos con proyección a fin de mes',
    blurb: 'No solo ves cuánto gastaste: te mostramos hacia dónde vas antes de que termine el mes.',
    preview: <BudgetPreview />,
  },
  {
    eyebrow: 'Multi-moneda',
    title: 'Pesos, dólares, y las transferencias entre medio',
    blurb: 'Cuentas en distintas monedas y transferencias entre ellas, sin perder el tipo de cambio de vista.',
    preview: <MultiCurrencyPreview />,
  },
  {
    eyebrow: 'Ingresos',
    title: 'De bruto a neto, con las deducciones claras',
    blurb: 'Cargá tu ingreso bruto y las deducciones — vemos juntos cuánto te queda en mano.',
    preview: <IncomePreview />,
  },
];

const TRUST_ITEMS = [
  {
    title: 'Tus datos son tuyos',
    body: 'La información de tus finanzas es tuya y de nadie más. Podés borrar tu cuenta cuando quieras.',
  },
  {
    title: 'Sin venta de datos',
    body: 'No vendemos ni compartimos tus datos con terceros. No hay modelo de negocio detrás de tu información.',
  },
  {
    title: 'Código propio',
    body: 'Manguitos se construye a medida, sin depender de plantillas cerradas ni de trackers de terceros.',
  },
];

export function LandingPage() {
  const year = new Date().getFullYear();

  return (
    <div className="flex min-h-svh flex-col bg-surface text-body">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Wordmark />
          <nav aria-label="Cuenta" className="flex items-center gap-2">
            <Link to="/login" className={GHOST_LINK_SM}>
              Iniciar sesión
            </Link>
            <Link to="/register" className={PRIMARY_LINK_SM}>
              Crear cuenta
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="text-center lg:text-left">
              <h1 className="flex items-center justify-center gap-2 text-2xl font-semibold leading-[1.2] text-ink lg:justify-start">
                <WordmarkIcon className="h-7 w-7 shrink-0 text-brand" />
                Manguitos
              </h1>
              <p className="mt-3 text-xl font-semibold leading-[1.2] text-ink sm:text-2xl">
                Tus finanzas personales, en serio pero humano.
              </p>
              <p className="mt-4 text-base leading-relaxed text-body">
                Gastos, presupuestos, ingresos y transferencias en un solo lugar — sin planillas,
                sin vueltas, sin venderte nada más que orden.
              </p>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <Link to="/register" className={PRIMARY_LINK_LG}>
                  Crear cuenta
                </Link>
                <Link to="/login" className={SECONDARY_LINK_LG}>
                  Iniciar sesión
                </Link>
              </div>
            </div>
            <div>
              <HeroPreview />
            </div>
          </div>
        </section>

        {/* Features */}
        <section aria-labelledby="features-heading" className="border-t border-line bg-surface-sunken/50">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
            <h2 id="features-heading" className="text-center text-xl font-semibold text-ink sm:text-2xl">
              Lo que ya podés hacer
            </h2>
            <div className="mt-10 flex flex-col gap-12">
              {FEATURES.map((feature, index) => (
                <div
                  key={feature.title}
                  className="grid items-center gap-6 lg:grid-cols-2 lg:gap-12"
                >
                  <div
                    className={
                      index % 2 === 1 ? 'text-center lg:order-2 lg:text-left' : 'text-center lg:text-left'
                    }
                  >
                    <p className="text-sm font-medium text-brand">{feature.eyebrow}</p>
                    <h3 className="mt-1 text-lg font-semibold text-ink">{feature.title}</h3>
                    <p className="mt-2 text-base text-body">{feature.blurb}</p>
                  </div>
                  <div className={index % 2 === 1 ? 'lg:order-1' : ''}>
                    <div className="mx-auto w-full max-w-sm">{feature.preview}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust */}
        <section aria-labelledby="trust-heading" className="border-t border-line">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
            <h2 id="trust-heading" className="text-center text-xl font-semibold text-ink sm:text-2xl">
              Honestidad ante todo
            </h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              {TRUST_ITEMS.map((item) => (
                <div key={item.title} className="flex flex-col items-center gap-2 text-center sm:items-start sm:text-left">
                  <CheckCircleIcon className="h-6 w-6 shrink-0 text-income" />
                  <h3 className="text-base font-semibold text-ink">{item.title}</h3>
                  <p className="text-sm text-body">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="border-t border-line">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-12 text-center sm:px-6 sm:py-16">
            <h2 className="text-xl font-semibold text-ink sm:text-2xl">Empezá cuando quieras</h2>
            <p className="max-w-md text-base text-body">
              Crear una cuenta lleva un minuto. Sin tarjeta, sin compromiso.
            </p>
            <Link to="/register" className={PRIMARY_LINK_LG}>
              Crear cuenta
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted sm:flex-row sm:px-6">
          <Wordmark />
          <div className="flex items-center gap-4">
            {/* Placeholder: reemplazar por el repo real cuando el proyecto sea público. */}
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="text-muted transition-colors duration-200 ease-out hover:text-ink"
            >
              GitHub
            </a>
            <span>&copy; {year} Manguitos</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
