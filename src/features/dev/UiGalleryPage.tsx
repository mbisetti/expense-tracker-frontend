import { useEffect, useState, type ReactNode } from 'react';
import { Button, type ButtonSize, type ButtonVariant } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { DateField } from '../../components/ui/DateField';
import { Card } from '../../components/ui/Card';
import { Amount, type AmountSize } from '../../components/ui/Amount';
import { Badge, type BadgeStatus } from '../../components/ui/Badge';
import { CheckCircleIcon, InfoIcon } from '../../components/ui/icons';
import { ProgressBar, type ProgressBarTone } from '../../components/ui/ProgressBar';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Skeleton, type SkeletonVariant } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { useToast } from '../../components/ui/toastContext';
import { BottomNav } from '../../components/ui/BottomNav';

const BUTTON_VARIANTS: ButtonVariant[] = ['primary', 'secondary', 'ghost', 'danger'];
const BUTTON_SIZES: ButtonSize[] = ['sm', 'md', 'lg'];
const AMOUNT_SIZES: AmountSize[] = ['sm', 'md', 'lg', 'xl'];
const BADGE_STATUSES: { status: BadgeStatus; label: string }[] = [
  { status: 'ok', label: 'Al día' },
  { status: 'warning', label: 'Cerca del límite' },
  { status: 'exceeded', label: 'Excedido' },
  { status: 'pending', label: 'Pendiente' },
  { status: 'info', label: 'Informativo' },
];
const PROGRESS_TONES: { tone: ProgressBarTone; ratio: number; label: string }[] = [
  { tone: 'brand', ratio: 0.35, label: 'Progreso genérico' },
  { tone: 'income', ratio: 0.6, label: 'Ahorro del mes' },
  { tone: 'warning', ratio: 0.85, label: 'Presupuesto Comida — cerca del límite' },
  { tone: 'expense', ratio: 1.15, label: 'Presupuesto Salidas — excedido' },
];
const SKELETON_VARIANTS: SkeletonVariant[] = ['text', 'card', 'list', 'chart'];

// Botones que disparan toasts vía useToast() — necesitan estar dentro del ToastProvider
// local de esta sección (el ToastProvider real de la app recién se monta en S19).
function ToastDemoButtons() {
  const toast = useToast();
  return (
    <>
      <Button variant="primary" onClick={() => toast.success('Cuenta guardada con éxito.')}>
        Disparar success
      </Button>
      <Button variant="danger" onClick={() => toast.error('No se pudo guardar. Reintentá.')}>
        Disparar error
      </Button>
    </>
  );
}

type ThemeChoice = 'system' | 'light' | 'dark';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-muted">{label}</p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

// Styleguide viva — muestra cada componente base con TODAS sus variantes/estados.
// Sólo se registra en el router cuando import.meta.env.DEV (ver router/AppRouter.tsx),
// así que no forma parte del bundle/ruta de producción.
export function UiGalleryPage() {
  const [theme, setTheme] = useState<ThemeChoice>('system');
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmDangerOpen, setConfirmDangerOpen] = useState(false);
  const [confirmLoadingOpen, setConfirmLoadingOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') {
      delete root.dataset.theme;
    } else {
      root.dataset.theme = theme;
    }
    return () => {
      delete root.dataset.theme;
    };
  }, [theme]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-12 p-6 pb-24 text-body">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">/dev/ui — Styleguide</h1>
          <p className="text-sm text-muted">
            Sólo en desarrollo. Cada componente base de <code>src/components/ui</code> con
            todas sus variantes/estados.
          </p>
        </div>
        <div className="flex items-center gap-2" role="group" aria-label="Tema">
          {(['system', 'light', 'dark'] as ThemeChoice[]).map((choice) => (
            <Button
              key={choice}
              type="button"
              size="sm"
              variant={theme === choice ? 'primary' : 'secondary'}
              onClick={() => setTheme(choice)}
              aria-pressed={theme === choice}
            >
              {choice === 'system' ? 'Sistema' : choice === 'light' ? 'Light' : 'Dark'}
            </Button>
          ))}
        </div>
      </header>

      <Section title="Button">
        {BUTTON_VARIANTS.map((variant) => (
          <Row key={variant} label={variant}>
            {BUTTON_SIZES.map((size) => (
              <Button key={size} variant={variant} size={size}>
                {variant} {size}
              </Button>
            ))}
            <Button variant={variant} disabled>
              disabled
            </Button>
            <Button variant={variant} loading>
              loading
            </Button>
            <Button variant={variant} leftIcon={<CheckCircleIcon />}>
              con leftIcon
            </Button>
            <Button variant={variant} rightIcon={<InfoIcon />}>
              con rightIcon
            </Button>
          </Row>
        ))}
      </Section>

      <Section title="Input">
        <Row label="estados">
          <Input label="Nombre" placeholder="Ej: Sueldo" className="max-w-xs" />
          <Input
            label="Nombre"
            defaultValue="Cuenta sueldo"
            helper="Como aparece en las listas."
            className="max-w-xs"
          />
          <Input
            label="Nombre"
            defaultValue=""
            error="Este campo es obligatorio."
            required
            className="max-w-xs"
          />
          <Input label="Nombre" defaultValue="Bloqueado" disabled className="max-w-xs" />
        </Row>
      </Section>

      <Section title="Select">
        <Row label="estados">
          <Select label="Tipo de cuenta" defaultValue="" className="max-w-xs">
            <option value="" disabled>
              Elegí una opción
            </option>
            <option value="CASH">Efectivo</option>
            <option value="DEBIT">Débito</option>
            <option value="CREDIT">Crédito</option>
          </Select>
          <Select
            label="Tipo de cuenta"
            defaultValue="CREDIT"
            error="Elegí un tipo válido."
            className="max-w-xs"
          >
            <option value="CASH">Efectivo</option>
            <option value="CREDIT">Crédito</option>
          </Select>
          <Select label="Tipo de cuenta" defaultValue="CASH" disabled className="max-w-xs">
            <option value="CASH">Efectivo</option>
          </Select>
        </Row>
      </Section>

      <Section title="DateField">
        <Row label="estados">
          <DateField label="Fecha" defaultValue="2026-07-15" className="max-w-xs" />
          <DateField
            label="Fecha"
            defaultValue=""
            error="Ingresá una fecha válida."
            required
            className="max-w-xs"
          />
          <DateField label="Fecha" defaultValue="2026-07-15" disabled className="max-w-xs" />
        </Row>
      </Section>

      <Section title="Card">
        <Row label="default">
          <Card className="w-64">
            <p className="text-ink">Card simple, sin header.</p>
          </Card>
        </Row>
        <Row label="con header">
          <Card className="w-64" header={<h3 className="font-semibold text-ink">Resumen</h3>}>
            <p>Contenido debajo del header, separado por línea.</p>
          </Card>
        </Row>
        <Row label="interactive (hover → sombra)">
          <Card className="w-64" interactive onClick={() => {}}>
            <p className="text-ink">Clickeable — hover para ver la sombra.</p>
          </Card>
        </Row>
      </Section>

      <Section title="Amount">
        <Row label="tone=auto">
          {AMOUNT_SIZES.map((size) => (
            <Amount key={size} amount={125430.5} currency="ARS" size={size} />
          ))}
        </Row>
        <Row label="tone=auto (negativo)">
          {AMOUNT_SIZES.map((size) => (
            <Amount key={size} amount={-4230.75} currency="ARS" size={size} />
          ))}
        </Row>
        <Row label="tone explícito (signo siempre a juego con el tono, no con el signo crudo)">
          <Amount amount={1000} currency="USD" tone="income" />
          <Amount amount={1000} currency="USD" tone="expense" />
          <Amount amount={-1000} currency="USD" tone="income" />
          <Amount amount={-1000} currency="USD" tone="expense" />
          <Amount amount={1000} currency="USD" tone="neutral" />
          <Amount amount={0} currency="ARS" />
        </Row>
      </Section>

      <Section title="Badge / StatusPill">
        <Row label="estados">
          {BADGE_STATUSES.map(({ status, label }) => (
            <Badge key={status} status={status} label={label} />
          ))}
        </Row>
      </Section>

      <Section title="ProgressBar">
        <Row label="tones">
          <div className="flex w-full max-w-sm flex-col gap-3">
            {PROGRESS_TONES.map(({ tone, ratio, label }) => (
              <ProgressBar key={tone} tone={tone} ratio={ratio} label={label} />
            ))}
          </div>
        </Row>
        <Row label="con markerRatio (proyección fin de mes, S16)">
          <div className="w-full max-w-sm">
            <ProgressBar
              tone="warning"
              ratio={0.55}
              markerRatio={0.9}
              label="Presupuesto Comida con proyección"
            />
          </div>
        </Row>
      </Section>

      <Section title="Skeleton">
        <Row label="variantes">
          <div className="flex w-full max-w-sm flex-col gap-6">
            {SKELETON_VARIANTS.map((variant) => (
              <div key={variant} className="flex flex-col gap-1">
                <p className="text-xs text-muted">{variant}</p>
                <Skeleton variant={variant} rows={3} />
              </div>
            ))}
          </div>
        </Row>
      </Section>

      <Section title="EmptyState">
        <Row label="sin CTA">
          <div className="w-full max-w-sm">
            <EmptyState
              title="No hay movimientos"
              message="Todavía no registraste transacciones este mes."
            />
          </div>
        </Row>
        <Row label="con CTA">
          <div className="w-full max-w-sm">
            <EmptyState
              title="No hay cuentas"
              message="Agregá tu primera cuenta para empezar a registrar movimientos."
              actionLabel="Agregar cuenta"
              onAction={() => {}}
            />
          </div>
        </Row>
      </Section>

      <Section title="Modal / ConfirmDialog">
        <Row label="Modal genérico">
          <Button variant="secondary" onClick={() => setModalOpen(true)}>
            Abrir modal
          </Button>
          <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Editar categoría"
            footer={
              <>
                <Button variant="secondary" onClick={() => setModalOpen(false)}>
                  Cancelar
                </Button>
                <Button variant="primary" onClick={() => setModalOpen(false)}>
                  Guardar
                </Button>
              </>
            }
          >
            <p>
              Contenido de ejemplo: focus trap, Esc y click en el backdrop cierran el modal, y
              el foco vuelve al botón que lo abrió.
            </p>
          </Modal>
        </Row>
        <Row label="ConfirmDialog (default)">
          <Button variant="secondary" onClick={() => setConfirmOpen(true)}>
            Abrir confirm
          </Button>
          <ConfirmDialog
            open={confirmOpen}
            title="Archivar cuenta"
            message="Podés reactivarla después desde Configuración."
            onConfirm={() => setConfirmOpen(false)}
            onCancel={() => setConfirmOpen(false)}
          />
        </Row>
        <Row label="ConfirmDialog (danger)">
          <Button variant="secondary" onClick={() => setConfirmDangerOpen(true)}>
            Abrir confirm danger
          </Button>
          <ConfirmDialog
            open={confirmDangerOpen}
            danger
            title="Borrar transacción"
            message="Esta acción no se puede deshacer."
            confirmLabel="Borrar"
            onConfirm={() => setConfirmDangerOpen(false)}
            onCancel={() => setConfirmDangerOpen(false)}
          />
        </Row>
        <Row label="ConfirmDialog (loading)">
          <Button variant="secondary" onClick={() => setConfirmLoadingOpen(true)}>
            Abrir confirm loading
          </Button>
          <ConfirmDialog
            open={confirmLoadingOpen}
            danger
            loading
            title="Borrando transacción…"
            message="Esta acción no se puede deshacer."
            confirmLabel="Borrar"
            onConfirm={() => {}}
            onCancel={() => setConfirmLoadingOpen(false)}
          />
        </Row>
      </Section>

      <Section title="Toast">
        <ToastProvider>
          <Row label="toast.success(msg) / toast.error(msg) — auto-dismiss ~4s, stackeable">
            <ToastDemoButtons />
          </Row>
        </ToastProvider>
      </Section>

      <Section title="BottomNav (v2)">
        <Row label="frame mobile (375×640) — real, aria-current según la ruta activa">
          <div className="flex flex-col gap-2">
            <div
              className="relative mx-auto h-[640px] w-[375px] overflow-hidden rounded-lg border border-line bg-surface"
              style={{ transform: 'translateZ(0)' }}
              // Sólo para esta demo: neutraliza la navegación real (el Link de react-router
              // aborta si el evento ya llega con defaultPrevented), así el click no saca a
              // Marko de /dev/ui. El componente en sí no se toca.
              onClickCapture={(event) => event.preventDefault()}
            >
              <p className="p-4 text-sm text-muted">Contenido de pantalla (mock)</p>
              <BottomNav />
            </div>
            <p className="max-w-sm text-xs text-muted">
              Se oculta en desktop (<code>md:hidden</code>, mobile-first). Para verla, angostá
              la ventana del navegador por debajo del breakpoint <code>md</code>.
            </p>
          </div>
        </Row>
      </Section>
    </div>
  );
}
