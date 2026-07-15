import {
  AlertOctagonIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  InfoIcon,
} from './icons';

export type BadgeStatus = 'ok' | 'warning' | 'exceeded' | 'pending' | 'info';

type BadgeProps = {
  status: BadgeStatus;
  label: string;
  className?: string;
};

// `info` no tiene token dedicado en design-principles.md — reusa `transfer` (azul,
// "movimiento neutro") en vez de inventar un hex nuevo. `pending` reusa `muted`
// (neutro terciario) por el mismo motivo.
const STATUS_CONFIG: Record<BadgeStatus, { icon: typeof CheckCircleIcon; classes: string }> = {
  ok: { icon: CheckCircleIcon, classes: 'bg-income/10 text-income' },
  warning: { icon: AlertTriangleIcon, classes: 'bg-warning/10 text-warning' },
  exceeded: { icon: AlertOctagonIcon, classes: 'bg-exceeded/10 text-exceeded' },
  pending: { icon: ClockIcon, classes: 'bg-muted/10 text-muted' },
  info: { icon: InfoIcon, classes: 'bg-transfer/10 text-transfer' },
};

// El color NUNCA comunica solo (§1.6/§4): siempre ícono + label, nunca sólo el chip de color.
export function Badge({ status, label, className }: BadgeProps) {
  const { icon: Icon, classes } = STATUS_CONFIG[status];

  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        classes,
        className ?? '',
      ]
        .join(' ')
        .trim()}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {label}
    </span>
  );
}
