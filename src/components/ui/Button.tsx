import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { SpinnerIcon } from './icons';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

// El acento de marca (índigo) es SOLO chrome interactivo (§1.5): primary lo usa acá.
// danger usa `expense` — única excepción admitida a la regla chrome↔dato, porque acá el
// semántico no describe un monto/estado financiero sino la severidad de la acción (borrar).
//
// Hover con `brand-bg` (tinte de marca, definido en ambos temas) en vez de `surface-sunken`:
// en dark, surface-sunken es MÁS oscuro que el fondo del botón → el hover lo oscurecía y
// perdía contraste (reporte 8a de Marko). brand-bg es un realce sutil y legible en light y dark.
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-on-brand hover:bg-brand-hover',
  secondary: 'border border-line bg-surface-elevated text-ink hover:bg-brand-bg',
  // ghost lleva borde para que se lea como botón (antes, sin el chrome nativo, quedaba como
  // texto suelto — reporte de Marko). Mismo borde que secondary, sin fondo de reposo.
  ghost: 'border border-line text-ink hover:bg-brand-bg',
  danger: 'bg-expense text-on-brand hover:brightness-90',
};

// Escala 4px: 11=44px, 12=48px, 14=56px — las tres tallas cumplen el mínimo de touch
// target de 44px (§4), incluso la "sm", así no hay un botón fuera de la regla.
const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-11 px-4 text-sm gap-1.5',
  md: 'h-12 px-5 text-base gap-2',
  lg: 'h-14 px-6 text-lg gap-2.5',
};

const ICON_SIZE: Record<ButtonSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-5 w-5',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  leftIcon,
  rightIcon,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={[
        'inline-flex items-center justify-center rounded-md font-medium',
        'cursor-pointer transition-colors duration-200 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className ?? '',
      ]
        .join(' ')
        .trim()}
      {...props}
    >
      {loading ? (
        <SpinnerIcon className={ICON_SIZE[size]} />
      ) : (
        leftIcon && <span className={`inline-flex ${ICON_SIZE[size]}`}>{leftIcon}</span>
      )}
      <span>{children}</span>
      {!loading && rightIcon && <span className={`inline-flex ${ICON_SIZE[size]}`}>{rightIcon}</span>}
    </button>
  );
}
