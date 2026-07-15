import { useId, type ReactNode, type SelectHTMLAttributes } from 'react';
import { AlertOctagonIcon, ChevronDownIcon } from './icons';
import {
  FIELD_BASE,
  FIELD_ERROR_CLASS,
  FIELD_HELPER_CLASS,
  FIELD_LABEL_CLASS,
  FIELD_WRAPPER_CLASS,
  fieldBorderClass,
} from './fieldStyles';

type SelectProps = {
  label: string;
  error?: string;
  helper?: string;
  id?: string;
  children: ReactNode;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'>;

export function Select({
  label,
  error,
  helper,
  id,
  className,
  required,
  children,
  ...props
}: SelectProps) {
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
      <div className="relative">
        <select
          id={fieldId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={[
            FIELD_BASE,
            fieldBorderClass(!!error),
            'appearance-none pr-10',
            className ?? '',
          ]
            .join(' ')
            .trim()}
          {...props}
        >
          {children}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      </div>
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
