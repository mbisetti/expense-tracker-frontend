import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { MenuIcon } from './icons';

export type ReorderListProps<T> = {
  /** Ítems en el orden actual. La lista es CONTROLADA: cada movimiento sale por onMove y el
   *  dueño decide qué hacer con el orden nuevo (guardarlo, o sólo tenerlo en estado). */
  items: T[];
  getId: (item: T) => string;
  /** Nombre para el aria-label del handle: "Mover {getLabel(item)}". */
  getLabel: (item: T) => string;
  renderRow: (item: T) => ReactNode;
  /** Se llama al soltar (o con las flechas) con el orden nuevo completo. */
  onMove: (next: T[]) => void;
};

type DragState = {
  /** Índice de la fila agarrada dentro del orden actual. */
  index: number;
  /** clientY del pointerdown, origen del desplazamiento. */
  startY: number;
  /** Cuánto se movió el dedo/mouse desde entonces. */
  dy: number;
  /** Dónde caería la fila si soltara ahora. */
  target: number;
  /** Alto de fila + gap: cuánto se corre cada vecino para hacerle lugar. */
  stride: number;
};

// Nació en ReorderAccountsModal (Sprint 22.4) y se extrajo en S48 para compartirla con el modal
// de categorías. El algoritmo se movió textualmente: las dos reglas de abajo son las que lo hacen
// no trabarse.
//
// Pointer events a mano (sin dependencia). Dos reglas que hacen que esto no se trabe:
//
// 1. **Los listeners de move/up viven en `window`, no en el handle.** Antes estaban en el
//    botoncito de 20px: apenas el cursor se salía de ahí dejaban de llegar eventos y el drag
//    moría a mitad de camino (reporte de Marko: "si se te va un poco el mouse se traba"). El
//    `setPointerCapture` tampoco alcanzaba, porque —ver punto 2— el nodo capturador se movía
//    de lugar en el DOM y el navegador libera la captura cuando eso pasa.
// 2. **El DOM NO se reordena mientras arrastrás.** Las filas quedan quietas y lo que se mueve
//    son `transform: translateY(...)`: la agarrada sigue al cursor y los vecinos se corren un
//    `stride` con transición. El array recién se reordena al soltar, y ahí las transiciones
//    están apagadas (`drag === null`), así que la fila cae exactamente donde ya se veía, sin
//    saltos: el cambio de layout y el reset del transform se cancelan entre sí.
//
// Los handlers cierran sobre `items` del render en que arrancó el gesto: durante un drag el
// dueño no cambia la lista, así que ese cierre es el orden vigente al soltar.
export function ReorderList<T>({ items, getId, getLabel, renderRow, onMove }: ReorderListProps<T>) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  // Geometría capturada al agarrar. Es válida durante todo el drag justamente porque el DOM
  // no se reordena (punto 2): las filas siguen donde estaban.
  const rectsRef = useRef<{ top: number; height: number }[]>([]);
  const listRef = useRef<HTMLUListElement>(null);
  const handlesRef = useRef(new Map<string, HTMLButtonElement>());
  const cleanupRef = useRef<(() => void) | null>(null);
  const hintId = useId();

  // Un drag en curso cuando se desmonta la lista dejaría los listeners colgados de window.
  useEffect(() => () => cleanupRef.current?.(), []);

  function commitMove(from: number, to: number) {
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onMove(next);
  }

  function startDrag(e: ReactPointerEvent<HTMLButtonElement>, index: number) {
    if (e.button !== 0 || dragRef.current || !listRef.current) return;
    const rects = (Array.from(listRef.current.children) as HTMLElement[]).map((el) => {
      const rect = el.getBoundingClientRect();
      return { top: rect.top, height: rect.height };
    });
    if (rects.length === 0) return;
    rectsRef.current = rects;

    const started: DragState = {
      index,
      startY: e.clientY,
      dy: 0,
      target: index,
      // Todas las filas miden igual, así que el salto entre dos tops ES el alto + el gap.
      stride: rects.length > 1 ? Math.abs(rects[1].top - rects[0].top) : rects[index].height,
    };
    dragRef.current = started;
    setDrag(started);
    // Redundante con los listeners de window para el mouse, pero en touch evita que el
    // navegador cancele el gesto si el dedo se sale del handle.
    e.currentTarget.setPointerCapture?.(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      const current = dragRef.current;
      if (!current) return;
      const rows = rectsRef.current;
      const dy = ev.clientY - current.startY;
      // Contra el CENTRO de la fila arrastrada, no contra el cursor: agarrar una fila del
      // borde de abajo no tiene por qué correr el punto en el que se dispara el swap.
      const center = rows[current.index].top + rows[current.index].height / 2 + dy;

      let target = current.index;
      for (let i = 0; i < current.index; i++) {
        if (center < rows[i].top + rows[i].height / 2) {
          target = i;
          break;
        }
      }
      for (let i = rows.length - 1; i > current.index; i--) {
        if (center > rows[i].top + rows[i].height / 2) {
          target = i;
          break;
        }
      }

      if (dy === current.dy && target === current.target) return;
      const next = { ...current, dy, target };
      dragRef.current = next;
      setDrag(next);
    };

    const finish = (commit: boolean) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      cleanupRef.current = null;
      const current = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      if (current && commit && current.target !== current.index) {
        commitMove(current.index, current.target);
      }
    };
    const onUp = () => finish(true);
    const onCancel = () => finish(false);

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    cleanupRef.current = () => finish(false);
  }

  // Alternativa sin puntería: el handle tiene foco propio y las flechas mueven la fila. Es el
  // camino accesible (§4) y de paso el que no exige pulso fino.
  function onHandleKeyDown(e: ReactKeyboardEvent<HTMLButtonElement>, index: number) {
    const delta = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
    if (delta === 0) return;
    const to = index + delta;
    if (to < 0 || to >= items.length) return;
    e.preventDefault();
    const movedId = getId(items[index]);
    commitMove(index, to);
    // React mueve el nodo del DOM al reordenar y el navegador le saca el foco: se lo devolvemos.
    requestAnimationFrame(() => handlesRef.current.get(movedId)?.focus());
  }

  // Offset visual de cada fila: la agarrada sigue al cursor, las de en medio se corren una
  // posición para dejar el hueco. El resto no se mueve.
  function offsetFor(index: number): number {
    if (!drag) return 0;
    if (index === drag.index) return drag.dy;
    if (drag.target > drag.index && index > drag.index && index <= drag.target) return -drag.stride;
    if (drag.target < drag.index && index >= drag.target && index < drag.index) return drag.stride;
    return 0;
  }

  return (
    <div className="flex flex-col gap-2">
      <p id={hintId} className="text-xs text-muted">
        Arrastrá desde el ícono, o movelas con las flechas ↑ ↓.
      </p>
      <ul ref={listRef} className="m-0 flex list-none flex-col gap-1 p-0">
        {items.map((item, index) => {
          const id = getId(item);
          const lifted = drag?.index === index;
          return (
            <li
              key={id}
              style={{ transform: `translateY(${offsetFor(index)}px)` }}
              className={[
                'relative flex items-center gap-3 rounded-md border px-2 py-2',
                lifted
                  ? 'z-10 border-brand bg-surface-elevated shadow-lg'
                  : 'border-line',
                // La transición existe SOLO durante el drag: al soltar tiene que apagarse en el
                // mismo commit en que cambia el orden, o la fila animaría el reset del transform
                // encima del salto de layout y se vería rebotar.
                drag && !lifted
                  ? 'transition-transform duration-150 ease-out motion-reduce:transition-none'
                  : '',
                drag ? 'select-none' : '',
              ]
                .join(' ')
                .trim()}
            >
              <button
                type="button"
                aria-label={`Mover ${getLabel(item)}`}
                aria-describedby={hintId}
                ref={(el) => {
                  if (el) handlesRef.current.set(id, el);
                  else handlesRef.current.delete(id);
                }}
                onPointerDown={(e) => startDrag(e, index)}
                onKeyDown={(e) => onHandleKeyDown(e, index)}
                className="flex h-11 w-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand active:cursor-grabbing"
              >
                <MenuIcon className="h-5 w-5" />
              </button>
              {renderRow(item)}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
