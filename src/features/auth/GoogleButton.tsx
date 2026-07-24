import { useEffect, useRef } from 'react';
import { renderGoogleButton } from '../../lib/googleAuth';
import { useTheme } from '../../lib/useTheme';
import { useGoogleLogin } from './useGoogleLogin';
import { useToast } from '../../components/ui/toastContext';
import type { ApiError } from '../../lib/http';

function googleErrorMessage(error: ApiError): string {
  switch (error.code) {
    case 'GOOGLE_ACCOUNT_MISMATCH':
      return 'Ese email ya está vinculado a otra cuenta de Google.';
    case 'GOOGLE_EMAIL_UNVERIFIED':
      return 'Tu email de Google no está verificado.';
    case 'GOOGLE_LOGIN_UNAVAILABLE':
      return 'El acceso con Google no está disponible por ahora.';
    case 'INVALID_GOOGLE_TOKEN':
      return 'No pudimos validar tu cuenta de Google. Probá de nuevo.';
    case 'RATE_LIMIT_EXCEEDED':
      return 'Demasiados intentos. Esperá un momento.';
    default:
      return 'Algo salió mal con Google. Intentá de nuevo.';
  }
}

// Botón oficial "Continuar con Google" (branding de Google, no customizable). Se pinta apenas
// carga el script GIS; si el script no carga (adblock), el login con contraseña sigue intacto.
export function GoogleButton() {
  const ref = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const { mutate } = useGoogleLogin();
  const toast = useToast();

  // Handler siempre actualizado, pero leído SOLO desde el efecto (no durante el render): así
  // el efecto que pinta el botón depende únicamente del theme y no se re-pinta en cada render.
  const onCredentialRef = useRef<(idToken: string) => void>(() => {});
  useEffect(() => {
    onCredentialRef.current = (idToken: string) => {
      mutate({ idToken }, { onError: (error) => toast.error(googleErrorMessage(error)) });
    };
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    el.innerHTML = ''; // re-pintar limpio si cambia el theme
    renderGoogleButton(el, {
      theme,
      onCredential: (idToken) => {
        if (!cancelled) onCredentialRef.current(idToken);
      },
    }).catch(() => {
      // Script no cargó (adblock/red): sin ruido, el login con contraseña sigue disponible.
    });
    return () => {
      cancelled = true;
    };
  }, [theme]);

  return <div ref={ref} className="flex justify-center" />;
}
