import { useId, type InputHTMLAttributes } from 'react';
import { AlertOctagonIcon } from './icons';
import {
  FIELD_BASE,
  FIELD_ERROR_CLASS,
  FIELD_HELPER_CLASS,
  FIELD_LABEL_CLASS,
  FIELD_WRAPPER_CLASS,
  fieldBorderClass,
} from './fieldStyles';

type DateFieldProps = {
  label: string;
  error?: string;
  helper?: string;
  id?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type'>;

// Wrapper de <input type="date"> con el mismo look/feel que Input/Select — separado
// porque las fechas numéricas también llevan tabular-nums (§2) y el proyecto las trata
// como su propio campo (fecha de transacción, fecha de transferencia, etc.).
export function DateField({
  label,
  error,
  helper,
  id,
  className,
  required,
  ...props
}: DateFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const helperId = `${fieldId}-helper`;
  const errorId = `${fieldId}-error`;
  const describedBy = error ? errorId : helper ? helperId : undefined;

  return (
    <div className={FIELD_WRAPPER_CLASS}>
      <label htmlFor={fieldId} className={FIELD_LABEL_CLASS}>
        {label}
        {required && (
          <span className="text-expense" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      <input
        id={fieldId}
        type="date"
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={[FIELD_BASE, fieldBorderClass(!!error), 'tabular-nums', className ?? '']
          .join(' ')
          .trim()}
        {...props}
      />
      {error ? (
        <p id={errorId} role="alert" className={FIELD_ERROR_CLASS}>
          <AlertOctagonIcon className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : helper ? (
        <p id={helperId} className={FIELD_HELPER_CLASS}>
          {helper}
        </p>
      ) : null}
    </div>
  );
}
