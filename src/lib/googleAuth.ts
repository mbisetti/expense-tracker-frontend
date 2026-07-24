// S25.1 — Google Identity Services (GIS) en modo botón/popup. El botón oficial devuelve un
// ID token (JWT firmado por Google) que mandamos al backend. Sin One Tap / prompt() (D5).
// GIS en modo botón funciona sin third-party cookies (Google migró a FedCM) — nada que configurar.

// Client ID público (D6): hardcodeado, no es secreto. Mismo valor que el default del backend.
export const GOOGLE_CLIENT_ID =
  '280565453217-2qj2cv59k29lu1joki4vihoobm82r0rs.apps.googleusercontent.com';

// Tipos ambient mínimos de window.google (sin dependencia @types nueva).
type GoogleIdConfig = {
  client_id: string;
  callback: (response: { credential: string }) => void;
};
type GoogleButtonOptions = {
  theme?: 'outline' | 'filled_black' | 'filled_blue';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  locale?: string;
  width?: number;
};
type GoogleAccountsId = {
  initialize: (config: GoogleIdConfig) => void;
  renderButton: (parent: HTMLElement, options: GoogleButtonOptions) => void;
};

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

const GIS_SRC = 'https://accounts.google.com/gsi/client';
let scriptPromise: Promise<GoogleAccountsId> | null = null;

// Carga perezosa y ÚNICA del script GIS (promise singleton). Resuelve cuando
// window.google.accounts.id existe. Si falla la carga (adblock), rechaza y permite reintento.
export function loadGoogleIdentity(): Promise<GoogleAccountsId> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve(window.google.accounts.id);
      return;
    }
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.accounts?.id) resolve(window.google.accounts.id);
      else reject(new Error('GIS cargó pero window.google.accounts.id no está disponible'));
    };
    script.onerror = () => {
      scriptPromise = null; // dejar reintentar en una carga posterior
      reject(new Error('No se pudo cargar Google Identity Services'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export type RenderGoogleButtonOptions = {
  theme: 'light' | 'dark';
  onCredential: (idToken: string) => void;
};

// Renderiza el botón oficial "Continuar con Google" dentro de `el`. El branding lo dicta
// Google (no se customiza con nuestro design system): outline en claro, filled_black en oscuro.
export async function renderGoogleButton(
  el: HTMLElement,
  { theme, onCredential }: RenderGoogleButtonOptions,
): Promise<void> {
  const id = await loadGoogleIdentity();
  id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (response) => onCredential(response.credential),
  });
  id.renderButton(el, {
    theme: theme === 'dark' ? 'filled_black' : 'outline',
    size: 'large',
    text: 'continue_with',
    locale: 'es',
  });
}
