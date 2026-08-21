import { useToast } from '../../components/ui/toastContext';
import { MailIcon } from '../../components/ui/icons';
import { useMe } from './useMe';
import { useResendVerification } from './useResendVerification';

// S25.2 — banner persistente mientras el email no esté verificado (D1: no se bloquea nada, se
// insiste). Vive DENTRO del header sticky de AppLayout, misma receta visual y de ubicación que
// OfflineBanner: el aviso no se pierde al scrollear.
export function VerifyEmailBanner() {
  const { data: me } = useMe();
  const toast = useToast();
  const resend = useResendVerification();

  // Sin datos todavía o ya verificado → nada. El banner solo existe cuando hay certeza de que
  // falta verificar (me cargado y emailVerified false).
  if (!me || me.emailVerified) return null;

  const handleResend = () => {
    resend.mutate(undefined, {
      onSuccess: () => toast.success('Mail reenviado. Revisá tu casilla.'),
      onError: (error) =>
        toast.error(
          error.code === 'RATE_LIMIT_EXCEEDED'
            ? 'Demasiados intentos. Esperá un momento.'
            : 'No se pudo reenviar el mail. Intentá de nuevo.',
        ),
    });
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-warning/10 px-4 py-1.5 text-sm text-warning"
    >
      <MailIcon className="h-4 w-4 shrink-0" />
      <span>
        Verificá tu email: te mandamos un mail a <span className="font-medium">{me.email}</span>.
        Sin verificar no podés recuperar tu contraseña si la olvidás.
      </span>
      <button
        type="button"
        onClick={handleResend}
        disabled={resend.isPending}
        className="min-h-11 font-medium underline underline-offset-2 hover:opacity-80 disabled:opacity-50"
      >
        {resend.isPending ? 'Reenviando...' : 'Reenviar'}
      </button>
    </div>
  );
}
