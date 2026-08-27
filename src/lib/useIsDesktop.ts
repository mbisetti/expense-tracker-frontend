import { useEffect, useState } from 'react';

const QUERY = '(min-width: 768px)';

// ¿El viewport está en el breakpoint md+ (desktop/tablet)? Para los casos donde una variante
// mobile y una desktop del MISMO elemento interactivo no pueden convivir en el DOM (dos botones
// con el mismo accessible name es ruido para lectores de pantalla y rompe los getByRole de los
// tests, que no aplican el CSS de Tailwind). Para esconder algo puramente visual alcanza con
// `hidden md:*` — este hook es solo para elegir UNA instancia.
// En jsdom no hay matchMedia (el proyecto lo usa siempre con `?.`): cae al default mobile.
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(
    () => window.matchMedia?.(QUERY).matches ?? false,
  );

  useEffect(() => {
    const mql = window.matchMedia?.(QUERY);
    if (!mql) return;
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isDesktop;
}
