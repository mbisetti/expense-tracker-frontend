import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Param de query que llega como ORDEN de una sola vez: los deep-links del centro de
 * notificaciones (`?edit=<txId>`, `?review=1`, `?confirm=<sourceId>`).
 *
 * Por qué no alcanza `useState(() => searchParams.get(name))`, que es como estaban escritos:
 * ese initializer corre SOLO al montar. Si el usuario ya está parado en la página destino, el
 * navigate() del panel cambia la URL pero no remonta nada, así que el param nunca se lee y el
 * tap no hace nada visible — la queja real: "cambia la URL y no me lleva a ningún lado".
 *
 * Acá el param se arma cada vez que APARECE en la URL, y se borra de la URL apenas se arma
 * (replace, sin ensuciar el historial). Borrarlo no es cosmética: es lo que hace que volver a
 * tocar la misma notificación vuelva a disparar, porque la URL pasa otra vez de "sin param" a
 * "con param". Si el param quedara pegado, el segundo tap navegaría a la misma URL y no habría
 * ningún cambio que detectar.
 *
 * Devuelve `[valor, consumir]`. El valor queda armado hasta que el llamador lo consume a mano,
 * porque para actuar la pantalla suele necesitar datos que todavía no llegaron (el feed, el
 * contador de pendientes): la orden espera, la URL no.
 *
 * El armado es un ajuste de estado DURANTE el render (el patrón de React para "las props
 * cambiaron"), no un efecto: setState en un efecto encadena un render de más y lo prohíbe el
 * lint. En el efecto queda sólo la limpieza de la URL, que es navegación y no estado.
 *
 * Nota: cada instancia limpia SU param. La app nunca emite dos deep-links juntos en la misma
 * URL (targetPath arma uno solo), así que dos instancias en la misma página nunca escriben la
 * URL en el mismo commit.
 */
export function useDeepLinkParam(name: string): [string | null, () => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get(name);

  const [pending, setPending] = useState(raw);
  // Última lectura de la URL que ya se convirtió en orden. Comparar contra esto (y no contra
  // `pending`) es lo que separa "todavía no lo consumieron" de "llegó uno nuevo".
  const [seen, setSeen] = useState(raw);

  if (raw !== seen) {
    setSeen(raw);
    // La desaparición del param es la limpieza de abajo, no una orden nueva: no pisa lo armado.
    if (raw !== null) setPending(raw);
  }

  useEffect(() => {
    if (raw === null) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete(name);
        return next;
      },
      { replace: true },
    );
  }, [raw, name, setSearchParams]);

  const consume = useCallback(() => setPending(null), []);

  return [pending, consume];
}
