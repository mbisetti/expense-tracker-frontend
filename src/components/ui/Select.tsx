import {
  Children,
  Fragment,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
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

type Opt = { value: string; label: ReactNode; text: string; disabled: boolean };

// Texto plano de un nodo (concatena, sin comas): un <option> como `{name} - Crédito` llega
// como array ['name', ' - Crédito'] — String() lo uniría con coma. Lo usamos para el typeahead
// y para que el nombre accesible de la opción coincida con el del <option> original.
function nodeToText(node: ReactNode): string {
  if (node == null || node === false || node === true) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeToText).join('');
  if (isValidElement(node)) return nodeToText((node.props as { children?: ReactNode }).children);
  return '';
}

// Aplana los <option> hijos (incluye fragments y arrays de .map()) a una lista plana. El label
// se guarda como ReactNode (se renderiza tal cual el <option>); `text` es su versión plana.
function collectOptions(children: ReactNode, out: Opt[]): void {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === Fragment) {
      collectOptions((child.props as { children?: ReactNode }).children, out);
      return;
    }
    if (child.type === 'option') {
      const props = child.props as {
        value?: string | number;
        children?: ReactNode;
        disabled?: boolean;
      };
      out.push({
        value: String(props.value ?? ''),
        label: props.children,
        text: nodeToText(props.children),
        disabled: !!props.disabled,
      });
    }
  });
}

// Select del design system reescrito como listbox custom (reemplaza al <select> nativo): el
// popup nativo no dejaba pintar el fondo de las <option> a todo el ancho (quedaba "a la mitad").
// Acá cada opción es un div full-width con hover gris parejo de borde a borde y la elegida con
// el índigo claro de marca. Mantiene la API pública (children <option> + value + onChange) — los
// call sites no cambian. Un <select> espejo oculto conserva la validación nativa de `required`
// en el submit del form (los forms hacen preventDefault sin revalidar en JS).
export function Select({
  label,
  error,
  helper,
  id,
  className,
  required,
  disabled,
  value,
  defaultValue,
  onChange,
  children,
  name,
  ...rest
}: SelectProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const labelId = `${fieldId}-label`;
  const listboxId = `${fieldId}-listbox`;
  const helperId = `${fieldId}-helper`;
  const errorId = `${fieldId}-error`;
  const describedBy = error ? errorId : helper ? helperId : undefined;

  const options = useMemo<Opt[]>(() => {
    const out: Opt[] = [];
    collectOptions(children, out);
    return out;
  }, [children]);

  const isControlled = value !== undefined;
  const [internal, setInternal] = useState<string>(
    defaultValue !== undefined ? String(defaultValue) : '',
  );
  const current = isControlled ? String(value) : internal;

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const typeahead = useRef<{ buffer: string; timer: ReturnType<typeof setTimeout> | undefined }>({
    buffer: '',
    timer: undefined,
  });

  const selectedIndex = options.findIndex((o) => o.value === current);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined;
  const isPlaceholder = current === '';

  const commit = (next: string) => {
    if (!isControlled) setInternal(next);
    onChange?.({ target: { value: next } } as unknown as ChangeEvent<HTMLSelectElement>);
  };

  const firstEnabled = (from: number, dir: 1 | -1): number => {
    let i = from;
    for (let n = 0; n < options.length; n++) {
      if (i >= 0 && i < options.length && !options[i].disabled) return i;
      i += dir;
    }
    return -1;
  };

  const openList = () => {
    if (disabled) return;
    setActiveIndex(
      selectedIndex >= 0 && !options[selectedIndex]?.disabled ? selectedIndex : firstEnabled(0, 1),
    );
    setOpen(true);
  };

  const closeList = (focusTrigger = true) => {
    setOpen(false);
    setActiveIndex(-1);
    if (focusTrigger) triggerRef.current?.focus();
  };

  const choose = (index: number) => {
    const opt = options[index];
    if (!opt || opt.disabled) return;
    commit(opt.value);
    closeList();
  };

  // Cierra al clickear afuera o con scroll externo; foco al listbox al abrir.
  useEffect(() => {
    if (!open) return;
    listboxRef.current?.focus();
    const onPointerDown = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const move = (dir: 1 | -1) => {
    setActiveIndex((prev) => {
      const start = prev < 0 ? (dir === 1 ? -1 : options.length) : prev;
      const next = firstEnabled(start + dir, dir);
      return next === -1 ? prev : next;
    });
  };

  const onTriggerKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp':
      case 'Enter':
      case ' ':
        e.preventDefault();
        openList();
        break;
    }
  };

  const onListKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        move(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        move(-1);
        break;
      case 'Home':
        e.preventDefault();
        setActiveIndex(firstEnabled(0, 1));
        break;
      case 'End':
        e.preventDefault();
        setActiveIndex(firstEnabled(options.length - 1, -1));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (activeIndex >= 0) choose(activeIndex);
        break;
      case 'Escape':
        e.preventDefault();
        closeList();
        break;
      case 'Tab':
        closeList(false);
        break;
      default:
        // Typeahead: salto a la primera opción que empieza con lo tecleado. El buffer acumula
        // teclas seguidas y se resetea con un timer (evita Date.now() en el componente).
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          clearTimeout(typeahead.current.timer);
          typeahead.current.buffer += e.key;
          typeahead.current.timer = setTimeout(() => {
            typeahead.current.buffer = '';
          }, 600);
          const q = typeahead.current.buffer.toLowerCase();
          const match = options.findIndex((o) => !o.disabled && o.text.toLowerCase().startsWith(q));
          if (match >= 0) setActiveIndex(match);
        }
    }
  };

  return (
    <div className={FIELD_WRAPPER_CLASS}>
      <label htmlFor={fieldId} id={labelId} className={FIELD_LABEL_CLASS}>
        {label}
        {required && (
          <span className="text-expense" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>

      <div ref={wrapperRef} className="relative">
        {/* Trigger: mismo look que Input/DateField (FIELD_BASE) para que el chrome sea idéntico. */}
        <button
          ref={triggerRef}
          type="button"
          id={fieldId}
          data-value={current}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          aria-labelledby={labelId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onClick={() => (open ? closeList() : openList())}
          onKeyDown={onTriggerKeyDown}
          className={[
            FIELD_BASE,
            fieldBorderClass(!!error),
            'flex items-center justify-between gap-2 pr-3 text-left',
            className ?? '',
          ]
            .join(' ')
            .trim()}
        >
          <span className={`truncate ${isPlaceholder ? 'text-muted' : ''}`}>
            {selectedOption ? selectedOption.label : ' '}
          </span>
          <ChevronDownIcon className="h-4 w-4 shrink-0 text-muted" />
        </button>

        {open && (
          <ul
            ref={listboxRef}
            id={listboxId}
            role="listbox"
            tabIndex={-1}
            aria-labelledby={labelId}
            aria-activedescendant={activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined}
            onKeyDown={onListKeyDown}
            className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-md border border-line bg-surface-elevated p-1 shadow-md focus-visible:outline-none"
          >
            {options.map((opt, index) => {
              const selected = opt.value === current;
              const active = index === activeIndex;
              return (
                <li
                  key={`${opt.value}-${index}`}
                  id={`${listboxId}-opt-${index}`}
                  data-value={opt.value}
                  role="option"
                  aria-selected={selected}
                  aria-disabled={opt.disabled || undefined}
                  onMouseEnter={() => !opt.disabled && setActiveIndex(index)}
                  onClick={() => choose(index)}
                  className={[
                    'flex min-h-11 w-full cursor-pointer items-center rounded-sm px-3 text-sm',
                    opt.disabled
                      ? 'cursor-not-allowed text-muted'
                      : active
                        ? 'bg-surface-sunken text-ink'
                        : selected
                          ? 'bg-brand-bg font-medium text-brand'
                          : 'text-ink',
                  ].join(' ')}
                >
                  {opt.label}
                </li>
              );
            })}
          </ul>
        )}

        {/* Espejo oculto: conserva la validación nativa de `required` en el submit (los forms
            hacen preventDefault sin revalidar). Sin label propio → getByLabelText resuelve al
            trigger, no a este. aria-hidden + tabIndex -1: fuera del árbol de accesibilidad y del
            tab order; el listbox de arriba es el control real para teclado y lectores. */}
        <select
          aria-hidden="true"
          tabIndex={-1}
          required={required}
          disabled={disabled}
          name={name}
          value={current}
          onChange={() => {}}
          className="sr-only"
          {...rest}
        >
          {children}
        </select>
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
