import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/toastContext';
import { useGenerateWhatsAppCode, useUnlinkWhatsApp, useWhatsAppLink } from './useWhatsApp';

// Bot de WhatsApp (S45): vincular el chat para anotar gastos escribiendo "gasté 10k en X".
//
// Si el canal no está configurado en el entorno (configured false), la sección no existe. Es la
// misma regla que TelegramSection con su botUsername null: sin eso, en dev aparecería una tarjeta
// que no puede funcionar y el usuario generaría códigos que no vinculan nada.
export function WhatsAppSection() {
  const toast = useToast();
  const { data: status } = useWhatsAppLink();
  const generate = useGenerateWhatsAppCode();
  const unlink = useUnlinkWhatsApp();
  const [confirmingUnlink, setConfirmingUnlink] = useState(false);

  if (!status?.configured) return null;

  const handleUnlink = () => {
    unlink.mutate(undefined, {
      onSuccess: () => toast.success('Bot desvinculado.'),
      onError: () => toast.error('No se pudo desvincular. Intentá de nuevo.'),
      onSettled: () => setConfirmingUnlink(false),
    });
  };

  return (
    <Card>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col">
          <h2 className="text-lg font-semibold text-ink">Bot de WhatsApp</h2>
          <span className="text-sm text-muted">
            Anotá gastos mandándole un mensaje: «gasté 10k en repuesto bici».
          </span>
        </div>

        {status.linked ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-sm text-income">Conectado</span>
              {status.maskedPhone ? (
                <span className="text-sm text-muted tabular-nums">{status.maskedPhone}</span>
              ) : null}
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setConfirmingUnlink(true)}
            >
              Desvincular
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {status.code ? (
              <div className="flex flex-col gap-2 rounded-md bg-surface-sunken p-3">
                <span className="text-2xl font-semibold tabular-nums tracking-widest text-ink">
                  {status.code}
                </span>
                {/* El deep link abre el chat con el código ya escrito: el usuario sólo toca
                    enviar. Es una comodidad, no un mecanismo de auth: lo que vincula sigue
                    siendo el código. Por eso, si no hay deep link, las instrucciones a mano
                    siguen estando. */}
                {status.deepLink ? (
                  <>
                    <a
                      href={status.deepLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-brand hover:underline"
                    >
                      Abrir el chat con el código escrito
                    </a>
                    <span className="text-sm text-muted">
                      Tocá enviar y listo. El código vence en 10 minutos.
                    </span>
                  </>
                ) : (
                  <ol className="m-0 flex list-decimal flex-col gap-0.5 pl-5 text-sm text-body">
                    <li>Abrí el chat del bot en WhatsApp</li>
                    <li>Mandale este código (vence en 10 minutos)</li>
                    <li>Listo: probá con «gasté 10k en repuesto bici»</li>
                  </ol>
                )}
              </div>
            ) : (
              <span className="text-sm text-muted">No conectado.</span>
            )}
            <div>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  generate.mutate(undefined, {
                    onError: () => toast.error('No se pudo generar el código.'),
                  })
                }
                loading={generate.isPending}
              >
                {status.code ? 'Generar otro código' : 'Generar código'}
              </Button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmingUnlink}
        title="Desvincular el bot"
        message="El bot va a dejar de anotar tus gastos. Podés volver a vincularlo cuando quieras."
        confirmLabel="Desvincular"
        loading={unlink.isPending}
        onConfirm={handleUnlink}
        onCancel={() => setConfirmingUnlink(false)}
      />
    </Card>
  );
}
