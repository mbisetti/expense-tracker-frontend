import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/toastContext';
import { useGenerateTelegramCode, useTelegramLink, useUnlinkTelegram } from './useTelegram';

// Bot de Telegram (S30): vincular el chat para anotar gastos escribiendo "gasté 10k en X".
// Si el backend no tiene bot configurado (botUsername null), la sección no existe (D9).
export function TelegramSection() {
  const toast = useToast();
  const { data: status } = useTelegramLink();
  const generate = useGenerateTelegramCode();
  const unlink = useUnlinkTelegram();
  const [confirmingUnlink, setConfirmingUnlink] = useState(false);

  if (!status?.botUsername) return null;

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
          <h2 className="text-lg font-semibold text-ink">Bot de Telegram</h2>
          <span className="text-sm text-muted">
            Anotá gastos mandándole un mensaje: «gasté 10k en repuesto bici».
          </span>
        </div>

        {status.linked ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-income">Conectado</span>
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
                <ol className="m-0 flex list-decimal flex-col gap-0.5 pl-5 text-sm text-body">
                  <li>
                    Abrí{' '}
                    <a
                      href={`https://t.me/${status.botUsername}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand hover:underline"
                    >
                      @{status.botUsername}
                    </a>{' '}
                    en Telegram
                  </li>
                  <li>Mandale este código (vence en 10 minutos)</li>
                  <li>Listo — probá con «gasté 10k en repuesto bici»</li>
                </ol>
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
