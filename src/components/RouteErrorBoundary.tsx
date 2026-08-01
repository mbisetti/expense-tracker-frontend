import { useRouteError } from 'react-router-dom';

/**
 * Hallazgo F2 — red bajo el trapecio.
 *
 * Antes no había ningún `errorElement` ni ErrorBoundary propio: un error de render (un `.map`
 * sobre undefined por una respuesta con forma inesperada, un `toFixed` sobre null) desmontaba el
 * árbol y dejaba PANTALLA EN BLANCO, sin forma de recuperarse salvo recargar a ciegas.
 *
 * Que el escenario no era hipotético lo prueba un comentario del propio código: `lib/money.ts`
 * dice "antes escalaba al ErrorBoundary del router. Degradamos con gracia en su lugar". O sea que
 * ya había pasado al menos una vez y se resolvió puntualmente en la función de formateo, sin
 * poner la red que cubre el caso general.
 *
 * No pretende explicar el error —eso es para el log— sino dejar al usuario con algo que hacer y
 * con la certeza de que sus datos no se tocaron.
 */
export function RouteErrorBoundary() {
  const error = useRouteError();

  // El detalle va a la consola, no a la pantalla: un stack trace no le sirve a quien está
  // mirando sus gastos, y puede filtrar forma interna de los datos.
  console.error('Error de render no controlado:', error);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold text-ink">Se rompió algo de esta pantalla</h1>
      <p className="text-sm text-body">
        No se tocó ninguno de tus datos. Recargá la página y, si vuelve a pasar, contanos desde
        Ajustes.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="min-h-11 rounded-sm bg-brand px-4 text-sm font-semibold text-white"
        >
          Recargar
        </button>
        <a
          href="/dashboard"
          className="min-h-11 rounded-sm border border-subtle px-4 text-sm font-semibold leading-[2.75rem] text-ink no-underline"
        >
          Ir al inicio
        </a>
      </div>
    </div>
  );
}
