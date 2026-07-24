// S25.1 — Google Identity Services (GIS), flujo de ID token programático. El widget oficial
// `renderButton` se descartó (S25.1 fix): en Firefox con FedCM off renderiza una tarjeta blanca
// dentro del iframe de accounts.google.com que ningún `theme` corrige y que no podemos estilar.
// En su lugar usamos un botón PROPIO (theme-aware) que al click dispara One Tap (`prompt()`):
// mismo callback e ID token de siempre → POST /auth/google, sin tocar el backend.

// Client ID público (D6): hardcodeado, no es secreto. Mismo valor que el default del backend.
export const GOOGLE_CLIENT_ID =
  '280565453217-2qj2cv59k29lu1joki4vihoobm82r0rs.apps.googleusercontent.com';

// Tipos ambient mínimos de window.google (sin dependencia @types nueva).
type GoogleIdConfig = {
  client_id: string;
  callback: (response: { credential: string }) => void;
};
type PromptMomentNotification = {
  isDisplayed?: () => boolean;
  isNotDisplayed?: () => boolean;
  getNotDisplayedReason?: () => string;
  isSkippedMoment?: () => boolean;
  getSkippedReason?: () => string;
};
type GoogleAccountsId = {
  initialize: (config: GoogleIdConfig) => void;
  prompt: (listener?: (notification: PromptMomentNotification) => void) => void;
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

// Inicializa GIS con nuestro callback (recibe el ID token) y dispara One Tap. Mismo flujo de
// siempre: el ID token va a POST /auth/google. `onUnavailable` se llama SOLO si la card no se
// pudo mostrar (bloqueada/cooldown/sin sesión), no cuando el usuario la cierra (acción normal).
// Re-inicializar en cada click es idempotente (sólo actualiza la config) y evita ordenar
// mount-init vs click.
export async function signInWithGoogle(
  onCredential: (idToken: string) => void,
  onUnavailable?: () => void,
): Promise<void> {
  const id = await loadGoogleIdentity();
  id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (response) => onCredential(response.credential),
  });
  id.prompt((notification) => {
    if (notification.isNotDisplayed?.()) onUnavailable?.();
  });
}
