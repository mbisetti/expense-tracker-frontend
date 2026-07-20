import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
} from 'react';
import { AlertOctagonIcon, CalendarIcon } from './icons';
import { useDateFormat, type DateFormatPref } from '../../lib/dateFormat';
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
  /** Valor en ISO 'YYYY-MM-DD' (o '' si está vacío). Contrato idéntico al anterior. */
  value?: string;
  /** Se dispara SOLO con fecha completa+válida (target.value = ISO) o con el campo vaciado
   *  (target.value = ''). Texto intermedio/inválido NO la dispara con la fecha vieja. */
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type' | 'value' | 'onChange'>;

// Sprint 23 (D1): DateField honra la preferencia de formato (useDateFormat) con un input de
// TEXTO enmascarado, no el <input type="date"> nativo (que seguía el locale del SO). El
// contrato público NO cambia: value/onChange siguen en ISO 'YYYY-MM-DD' → cero cambios en los
// consumidores; arregla de una vez el form de tx, el de transferencias, ingresos y los filtros.
// D10: los dígitos van con la voz de los montos (font-semibold tabular-nums) SIN el leading-[1.1]
// (exclusivo de Amount por design-principles §2).

const PLACEHOLDER: Record<DateFormatPref, string> = {
  ar: 'DD/MM/AAAA',
  us: 'MM/DD/AAAA',
};

// Enmascara dígitos a XX/XX/XXXX. El layout es común a ambas prefs (cambia la interpretación,
// no la forma). Paste tolerante (descarta lo no-numérico); backspace re-enmascara sin dejar
// una '/' colgada al final.
function mask(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 8);
  let out = d.slice(0, 2);
  if (d.length > 2) out += '/' + d.slice(2, 4);
  if (d.length > 4) out += '/' + d.slice(4, 8);
  return out;
}

// Texto enmascarado → ISO, o null si está incompleto (<8 dígitos) o es un día imposible
// (32, 13, 31/02…). Se valida con un Date real: si el constructor "corrige" el rollover
// (31/02 → 03/03), los componentes no coinciden y se rechaza.
function parseToIso(text: string, pref: DateFormatPref): string | null {
  const d = text.replace(/\D/g, '');
  if (d.length !== 8) return null;
  const dd = pref === 'us' ? d.slice(2, 4) : d.slice(0, 2);
  const mm = pref === 'us' ? d.slice(0, 2) : d.slice(2, 4);
  const yyyy = d.slice(4, 8);
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  const probe = new Date(year, month - 1, day);
  if (probe.getFullYear() !== year || probe.getMonth() + 1 !== month || probe.getDate() !== day) {
    return null;
  }
  return `${yyyy}-${mm}-${dd}`;
}

function isoToText(iso: string, pref: DateFormatPref): string {
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return '';
  return pref === 'us' ? `${m}/${d}/${y}` : `${d}/${m}/${y}`;
}

export function DateField({
  label,
  error,
  helper,
  id,
  className,
  required,
  value = '',
  onChange,
  disabled,
  ...rest
}: DateFieldProps) {
  const { pref } = useDateFormat();
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const helperId = `${fieldId}-helper`;
  const errorId = `${fieldId}-error`;

  const [text, setText] = useState(() => (value ? isoToText(value, pref) : ''));
  const [touched, setTouched] = useState(false);
  // Último valor que EMITIMOS al padre. Distingue un cambio externo de `value` (reset,
  // prefill, toggle de pref) del eco de nuestro propio emit.
  const lastEmitted = useRef<string>(value);
  const textRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLInputElement>(null);

  // Sync desde el ISO del padre SOLO en un cambio externo — no en el eco de lo que emitimos
  // (así no pisamos el tipeo en curso ni el cursor). En un toggle de preferencia con fecha
  // cargada, reformatea el texto.
  useEffect(() => {
    if (value !== lastEmitted.current) {
      setText(value ? isoToText(value, pref) : '');
      lastEmitted.current = value;
      setTouched(false);
    } else if (value) {
      setText(isoToText(value, pref));
    }
  }, [value, pref]);

  const iso = parseToIso(text, pref);
  const digits = text.replace(/\D/g, '').length;
  // Error propio: texto no vacío que no parsea, ya con blur o con los 8 dígitos completos
  // (una fecha imposible se marca al toque; una incompleta, recién al salir del campo).
  const localInvalid = text !== '' && iso === null && (touched || digits === 8);
  const shownError = error ?? (localInvalid ? 'Fecha inválida.' : undefined);
  const describedBy = shownError ? errorId : helper ? helperId : undefined;

  function emit(next: string) {
    if (next === lastEmitted.current) return;
    lastEmitted.current = next;
    onChange?.({ target: { value: next } } as unknown as ChangeEvent<HTMLInputElement>);
  }

  // Custom validity: bloquea el submit nativo del form cuando el campo es requerido y no hay
  // una fecha válida — nunca se submitea en silencio la fecha anterior que quedó en el estado
  // del form (contrato D1). La burbuja del browser ancla al input visible.
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    const ok = text === '' ? !required : iso !== null;
    el.setCustomValidity(ok ? '' : 'Completá una fecha válida.');
  }, [text, iso, required]);

  function handleText(e: ChangeEvent<HTMLInputElement>) {
    const masked = mask(e.target.value);
    setText(masked);
    if (masked === '') {
      emit('');
      return;
    }
    // Completa+válida → ISO; intermedia/inválida → '' (una sola vez, dedup por lastEmitted).
    emit(parseToIso(masked, pref) ?? '');
  }

  function commitFromPicker(e: ChangeEvent<HTMLInputElement>) {
    const nextIso = e.target.value; // el <input type="date"> nativo entrega ISO
    setText(nextIso ? isoToText(nextIso, pref) : '');
    setTouched(false);
    emit(nextIso);
  }

  function openPicker() {
    const el = pickerRef.current;
    if (!el) return;
    try {
      el.showPicker();
    } catch {
      el.focus();
      el.click();
    }
  }

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
        <input
          ref={textRef}
          id={fieldId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder={PLACEHOLDER[pref]}
          value={text}
          onChange={handleText}
          onBlur={() => setTouched(true)}
          required={required}
          disabled={disabled}
          aria-invalid={shownError ? true : undefined}
          aria-describedby={describedBy}
          className={[
            FIELD_BASE,
            fieldBorderClass(!!shownError),
            'pr-10 font-semibold tabular-nums',
            className ?? '',
          ]
            .join(' ')
            .trim()}
          {...rest}
        />
        <button
          type="button"
          onClick={openPicker}
          disabled={disabled}
          aria-label="Abrir calendario"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CalendarIcon className="h-4 w-4" />
        </button>
        {/* Input date nativo oculto para el picker: opacity-0 + absolute (NO display:none —
            showPicker() falla en varios browsers si el input no está renderizado). */}
        <input
          ref={pickerRef}
          type="date"
          tabIndex={-1}
          aria-hidden="true"
          value={iso ?? ''}
          onChange={commitFromPicker}
          className="pointer-events-none absolute bottom-0 right-2 h-0 w-0 opacity-0"
        />
      </div>

      {shownError ? (
        <p id={errorId} role="alert" className={FIELD_ERROR_CLASS}>
          <AlertOctagonIcon className="h-3.5 w-3.5 shrink-0" />
          {shownError}
        </p>
      ) : helper ? (
        <p id={helperId} className={FIELD_HELPER_CLASS}>
          {helper}
        </p>
      ) : null}
    </div>
  );
}
