import { Navigate, Outlet } from 'react-router-dom';
import { useMe } from '../auth/useMe';

/**
 * S46 (fix del 2 Sep) — mientras la guía esté pendiente, cualquier pantalla privada lleva a ella.
 *
 * **Por qué hace falta.** La guía tenía UNA sola puerta de entrada: el CTA del dashboard. Un
 * usuario nuevo que aterrizara en cualquier otra pantalla no tenía forma de llegar, y eso pasó de
 * verdad: al cerrar sesión desde Gastos el guard anota de dónde venías, y en el alta ese destino
 * le ganaba a `/onboarding`. La cuenta nueva caía en Gastos, veía todo vacío, y la guía no
 * aparecía por ningún lado. (La otra mitad de ese caso se arregla en `useRegister`.)
 *
 * **Redirigir es seguro y no encierra a nadie:** "Saltar por ahora" y "Listo" llaman al MISMO
 * endpoint y las dos marcan `onboarded`, así que después del primer salto esto no vuelve a
 * disparar. Saltable no es lo mismo que escondida.
 *
 * **Vive envolviendo a AppLayout y no adentro.** `/onboarding` es HERMANA de `AppLayout` en el
 * router, así que queda excluida sola: no hay que chequear la ruta actual ni cuidarse de un loop
 * de redirecciones. Y `AppLayout` sigue siendo un layout y no un guard.
 *
 * **Mientras `me` no llegó no se decide nada**, y por eso la comparación es `=== false` y no un
 * `!me?.onboarded`: con el perfil todavía cargando, "no sé" y "no la hizo" se ven igual, y mandar
 * a la guía a alguien que ya la completó es peor que mostrarle su pantalla un instante después.
 */
export function OnboardingGate() {
  const { data: me } = useMe();

  if (me?.onboarded === false) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
