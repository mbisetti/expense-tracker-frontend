type ReservedTextProps = {
  /** El texto que se muestra ahora. */
  children: string;
  /** La variante MÁS LARGA que este lugar puede llegar a mostrar: es la que reserva el tamaño. */
  longest: string;
};

/**
 * Un texto que ocupa siempre el lugar de su versión más larga, así cambiarlo no reacomoda nada.
 *
 * <p>El caso que lo trajo (S49): el toggle "Ajustar por inflación" cambia el subtítulo del gráfico
 * del Dashboard y el texto auxiliar del switch por versiones más largas. Con el tamaño atado al
 * contenido, cada toque ensanchaba el bloque, le sumaba una línea y movía todo lo que tenía al
 * lado y abajo.
 *
 * <p><b>Reserva por contenido y no por número.</b> Las dos variantes se apilan en la MISMA celda de
 * un grid: la más larga fija el alto y el ancho, y sólo la vigente se ve. Un `min-h-*` a mano sería
 * más corto de escribir, pero habría que recalcularlo cada vez que cambia el copy y cuántas líneas
 * entran depende del ancho disponible y de la tipografía del que mira. Acá la reserva es exacta por
 * construcción, y si mañana la frase crece, la reserva crece con ella.
 *
 * <p>Dos detalles que no son de estilo:
 * <ul>
 *   <li>El fantasma va <b>aria-hidden</b>: sin eso el lector de pantalla leería la frase dos veces.
 *   <li>El fantasma <b>sólo se monta cuando no es el texto vigente</b>. Así cada frase existe una
 *       sola vez en el DOM y un `getByText` no encuentra dos nodos.
 * </ul>
 */
export function ReservedText({ children, longest }: ReservedTextProps) {
  return (
    <span className="grid">
      {longest !== children && (
        <span aria-hidden="true" className="invisible col-start-1 row-start-1">
          {longest}
        </span>
      )}
      <span className="col-start-1 row-start-1">{children}</span>
    </span>
  );
}
