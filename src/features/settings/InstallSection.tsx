import { useEffect, useRef } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { DownloadIcon } from '../../components/ui/icons';
import { useToast } from '../../components/ui/toastContext';
import { useInstallPrompt } from '../../lib/useInstallPrompt';

// S35 — "Instalar la app". Esta fila ES el prompt: no hay banner automático ni en el login
// ni adentro de la app (D7, mismo criterio que el gate blando del email). Si con usuarios
// de prueba se ve que nadie la encuentra, un banner discreto es un sprint de una tarde.
export function InstallSection() {
  const toast = useToast();
  const { status, justInstalled, promptInstall } = useInstallPrompt();

  // El toast se dispara una sola vez, y desde un componente que en ese mismo render ya
  // devuelve null: sigue montado (el padre lo renderiza siempre), así que el efecto corre.
  const announced = useRef(false);
  useEffect(() => {
    if (!justInstalled || announced.current) return;
    announced.current = true;
    toast.success('¡Listo! Manguitos quedó instalada.');
  }, [justInstalled, toast]);

  if (status === 'hidden') return null;

  return (
    <Card>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col">
          <h2 className="text-lg font-semibold text-ink">Instalar la app</h2>
          <span className="text-sm text-muted">
            Queda con ícono propio en tu teléfono o escritorio, abre en pantalla completa y
            arranca directo en tu Overview.
          </span>
        </div>

        {status === 'promptable' && (
          <div>
            <Button type="button" variant="secondary" onClick={promptInstall} leftIcon={<DownloadIcon />}>
              Instalar
            </Button>
          </div>
        )}

        {status === 'dismissed' && (
          <span className="text-sm text-muted">
            Se canceló la instalación. Recargá la página si querés volver a intentarlo.
          </span>
        )}

        {status === 'ios' && (
          <ol className="m-0 flex list-decimal flex-col gap-0.5 rounded-md bg-surface-sunken p-3 pl-8 text-sm text-body">
            <li>Tocá el botón Compartir de Safari (el cuadradito con la flecha).</li>
            <li>Elegí «Agregar a la pantalla de inicio».</li>
          </ol>
        )}
      </div>
    </Card>
  );
}
