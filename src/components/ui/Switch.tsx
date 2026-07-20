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
// (Space/Enter — nativo del <button>). S24.2 fix: track APAGADO en `bg-muted/40` (gris claro
// visible; antes `bg-surface-sunken` era casi idéntico al Card y el switch off parecía un
// círculo flotando) → `bg-brand` activo; perilla BLANCA (contrasta sobre ambos tracks y en
// ambos temas). Sin borde. Foco visible SIN ring-offset (lección S21).
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
        // Inset simétrico de 2px (p-0.5): la perilla anida dentro del track y el translate
        // cierra exacto. track 44 (w-11) − knob 20 (w-5) − 2 − 2 = 20 = translate-x-5.
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-brand' : 'bg-muted/40',
      ].join(' ')}
    >
      <span
        aria-hidden="true"
        className={[
          'inline-block h-5 w-5 transform rounded-full bg-[#ffffff] shadow transition-transform duration-200 ease-out',
          // OFF: en el padding izquierdo (translate-x-0). ON: translate-x-5 (=20px) → 2px del
          // borde derecho. Hueco simétrico de 2px a ambos lados.
          checked ? 'translate-x-5' : 'translate-x-0',
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
