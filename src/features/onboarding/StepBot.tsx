import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { StepIntro } from './StepIntro';

type StepBotProps = {
  /** Sale del wizard hacia /telegram marcándolo completo: es el último paso. */
  onGoToBot: () => void;
};

// Paso 5 — el bot. Es una card que explica y linkea, no un flujo de vinculación adentro del
// wizard: vincular es pedirle a alguien que abra otra app en el minuto cinco, y la página del
// bot ya cuenta todo lo que hace.
export function StepBot({ onGoToBot }: StepBotProps) {
  return (
    <div className="flex flex-col gap-4">
      <StepIntro
        title="Anotá sin abrir la app"
        lines={[
          'Thoth es el bot de Maat. Le escribís por Telegram y el gasto queda anotado.',
          'Es opcional, pero es la forma más rápida de que anotar no se te vuelva una tarea.',
        ]}
      />

      <Card>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-body">
            Escribile «gasté 10k en el super» y listo. También lee la foto del ticket y el PDF
            del resumen de la tarjeta.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="self-start"
            onClick={onGoToBot}
          >
            Conocer el bot
          </Button>
        </div>
      </Card>
    </div>
  );
}
