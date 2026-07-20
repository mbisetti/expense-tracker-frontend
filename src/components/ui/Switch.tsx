import { useId } from 'react';

type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Etiqueta visible; si se omite, pasá `ariaLabel`. */
  label?: string;
  ariaLabel?: string;
  helper?: string;
  disabled?: boolean;
  id?: string;
};

// Switch accesible del design system (Sprint 24). role="switch" + aria-checked; teclado
// (Space/Enter — nativo del <button>); track bg-surface-sunken → bg-brand activo. Foco
// visible SIN ring-offset (lección S21: el offset se comía contra fondos oscuros).
export function Switch({ checked, onChange, label, ariaLabel, helper, disabled, id }: SwitchProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const helperId = `${fieldId}-helper`;
  const labelId = `${fieldId}-label`;

  const button = (
    <button
      type="button"
      role="switch"
      id={fieldId}
      aria-checked={checked}
      aria-label={label ? undefined : ariaLabel}
      aria-labelledby={label ? labelId : undefined}
      aria-describedby={helper ? helperId : undefined}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-brand' : 'border border-line bg-surface-sunken',
      ].join(' ')}
    >
      <span
        aria-hidden="true"
        className={[
          'inline-block h-4 w-4 transform rounded-full bg-surface shadow transition-transform duration-200 ease-out',
          checked ? 'translate-x-6' : 'translate-x-1',
        ].join(' ')}
      />
    </button>
  );

  if (!label) {
    return button;
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span id={labelId} className="text-sm font-medium text-ink">
          {label}
        </span>
        {button}
      </div>
      {helper && (
        <p id={helperId} className="text-xs text-muted">
          {helper}
        </p>
      )}
    </div>
  );
}
