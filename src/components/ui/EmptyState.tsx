import type { ReactNode } from 'react';
import { Button } from './Button';
import { EmptyBoxIcon } from './icons';

type EmptyStateProps = {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Ilustración custom; por default usa EmptyBoxIcon. */
  icon?: ReactNode;
  className?: string;
};

// El estándar de lista/dato vacío del sistema (§5 design-principles.md): ilustración +
// mensaje + CTA opcional. Nunca una vista en blanco.
export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={['flex flex-col items-center gap-3 py-12 text-center', className ?? '']
        .join(' ')
        .trim()}
    >
      <span className="text-muted" aria-hidden="true">
        {icon ?? <EmptyBoxIcon className="h-16 w-16" />}
      </span>
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      {message && <p className="max-w-sm text-sm text-muted">{message}</p>}
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction} className="mt-2">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
