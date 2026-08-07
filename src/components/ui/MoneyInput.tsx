import { useLayoutEffect, useRef, type ChangeEvent } from 'react';
import { Input } from './Input';
import { caretAfterSignificant, countSignificant, formatAmountDisplay } from '../../lib/money';

type MoneyInputProps = {
  label: string;
  id: string;
  /** Display string (estado del padre), ej. "150.000,50". Parsealo con parseAmountInput. */
  value: string;
  onValueChange: (display: string) => void;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helper?: string;
  placeholder?: string;
  className?: string;
  /**
   * S43 (D8): cuántos decimales admite. Default 2 (plata) — ningún form existente cambia.
   * La cantidad de una cripto usa 8: "0,0074 BTC" con dos decimales queda en "0,01" y el usuario
   * guarda un número que no es el suyo.
   */
  maxDecimals?: number;
};

// Campo de monto del design system: reusa Input pero fuerza entrada numérica es-AR con
// separador de miles en vivo y SIN las flechitas de spinner (type=text + inputMode=decimal,
// no type=number). Bloquea letras/símbolos vía formatAmountDisplay. Resuelve los reclamos de
// "flechitas", "que autocomplete puntos" y "me deja poner letras y simbolos" de una.
//
// **El cursor se restaura a mano.** Es un input controlado que se reformatea en cada tecla: el
// valor del DOM cambia y el navegador manda el cursor al final. Editar en el MEDIO de un número
// era imposible — parado sobre el primer cero de "490.000", el primer backspace borraba bien
// pero saltaba al final, así que el segundo se comía el último dígito y quedaba "4.900" en vez
// de lo que uno estaba tratando de escribir.
//
// La restauración cuenta por DÍGITOS y no por caracteres (ver caretAfterSignificant): los
// separadores de miles se corren solos al cambiar la cantidad de dígitos, así que la posición en
// caracteres no significa lo mismo antes y después de formatear.
export function MoneyInput({ value, onValueChange, maxDecimals, ...rest }: MoneyInputProps) {
  // El nodo sale del propio evento: Input no reenvía refs y no hace falta que lo haga.
  const elementRef = useRef<HTMLInputElement | null>(null);
  const caretRef = useRef<number | null>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const element = e.currentTarget;
    const raw = element.value;
    const caret = element.selectionStart ?? raw.length;

    const formatted = formatAmountDisplay(raw, maxDecimals);

    elementRef.current = element;
    caretRef.current = caretAfterSignificant(formatted, countSignificant(raw.slice(0, caret)));

    onValueChange(formatted);
  };

  // useLayoutEffect y no useEffect: el cursor se reposiciona ANTES de que el browser pinte, así
  // no se ve el salto al final. Corre sólo cuando hubo una edición (caretRef seteado), no en
  // cada render del padre.
  useLayoutEffect(() => {
    const element = elementRef.current;
    const caret = caretRef.current;
    if (element && caret !== null) {
      caretRef.current = null;
      // El input puede haber perdido el foco entre el cambio y el efecto (blur inmediato):
      // reposicionar entonces le robaría el cursor a otro campo.
      if (document.activeElement === element) {
        element.setSelectionRange(caret, caret);
      }
    }
  });

  return (
    <Input
      {...rest}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={value}
      onChange={handleChange}
    />
  );
}
