import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/toastContext';
import { FIELD_BASE, fieldBorderClass } from '../../components/ui/fieldStyles';
import { useSendFeedback } from '../feedback/useFeedback';
import { useTelegramLink } from './useTelegram';

// Mini-landing del bot (S33): qué hace, cómo anota y los comandos. Se llega desde el ícono
// de info en Ajustes → Bot de Telegram. Cierra con el buzón de recomendaciones.

const FUNCTIONS: { label: string; example: string }[] = [
  { label: 'Un gasto, así nomás', example: '«gasté 10k en repuesto bici»' },
  { label: 'La foto del ticket', example: 'lee el total, la tarjeta, la fecha y los renglones' },
  { label: 'Cuotas', example: '«auriculares 150k en 3 cuotas»' },
  { label: 'Gastos compartidos', example: '«cena con bauti y coty, pagué yo, 20k cada uno»' },
  { label: 'Reparto por ítems (con foto)', example: '«la hamburguesa doble es mía, la simple de bauti»' },
  { label: 'Correcciones antes de confirmar', example: '«eran 12k», «usé efectivo», «era de ayer»' },
  {
    label: 'El PDF del extracto o del resumen de la tarjeta',
    example: 'te pregunta la cuenta, lo lee y te lo deja en Por revisar',
  },
];

const COMMANDS: { command: string; description: string }[] = [
  { command: '/resumen', description: 'cuánto gastaste este mes' },
  { command: '/saldo', description: 'la plata de tus cuentas' },
  { command: '/tarjeta', description: 'el gasto del ciclo de tus tarjetas' },
];

export function TelegramInfoPage() {
  const toast = useToast();
  const { data: status } = useTelegramLink();
  const sendFeedback = useSendFeedback();
  const [suggestion, setSuggestion] = useState('');

  const handleSend = () => {
    sendFeedback.mutate(
      { context: 'telegram-bot', message: suggestion.trim() },
      {
        onSuccess: () => {
          setSuggestion('');
          toast.success('¡Gracias! Las leemos todas.');
        },
        onError: () => toast.error('No se pudo enviar. Intentá de nuevo.'),
      },
    );
  };

  return (
    <section className="flex flex-col gap-4 text-left">
      {/* S25.4 (D7): el bot vive en los Conectores de la página Cuenta, no en Ajustes. */}
      <PageHeader
        title="El bot de Telegram"
        backTo={{ to: '/account', label: 'Cuenta' }}
        description="Anotá gastos desde el chat, sin abrir la app. Siempre te muestra el resumen antes de anotar: nada toca tus cuentas hasta que confirmás."
      />

      <Card>
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-ink">Qué le podés mandar</h2>
          <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
            {FUNCTIONS.map((item) => (
              <li key={item.label} className="flex flex-col gap-0.5 py-2.5 first:pt-0 last:pb-0">
                <span className="text-sm font-medium text-ink">{item.label}</span>
                <span className="text-sm text-muted">{item.example}</span>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-ink">Cómo anota</h2>
          <ol className="m-0 flex list-decimal flex-col gap-1.5 pl-5 text-sm text-body">
            <li>Le escribís el gasto o le mandás la foto del ticket.</li>
            <li>Te muestra el borrador con ✅ Confirmar y ❌ Cancelar.</li>
            <li>Si algo está mal, le escribís la corrección y actualiza el borrador.</li>
            <li>Después de anotar podés cambiar la cuenta o deshacer desde el mismo chat.</li>
          </ol>
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-ink">Comandos</h2>
          <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
            {COMMANDS.map((item) => (
              <li key={item.command} className="flex items-baseline gap-3 py-2.5 first:pt-0 last:pb-0">
                <code className="shrink-0 rounded-sm bg-surface-sunken px-1.5 py-0.5 text-sm text-brand">
                  {item.command}
                </code>
                <span className="text-sm text-body">{item.description}</span>
              </li>
            ))}
          </ul>
          {status?.botUsername ? (
            <a
              href={`https://t.me/${status.botUsername}`}
              target="_blank"
              rel="noreferrer"
              className="self-start text-sm text-brand hover:underline"
            >
              Abrir @{status.botUsername} en Telegram
            </a>
          ) : null}
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold text-ink">¿Qué le agregarías?</h2>
            <span className="text-sm text-muted">
              Contanos qué te gustaría que el bot haga. Las recomendaciones nos llegan directo.
            </span>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="sr-only">Tu recomendación</span>
            <textarea
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="Por ejemplo: que me avise cuando vence una cuota"
              className={`${FIELD_BASE} ${fieldBorderClass(false)} min-h-24 resize-y py-2.5`}
            />
          </label>
          <div>
            <Button
              type="button"
              variant="secondary"
              onClick={handleSend}
              disabled={suggestion.trim().length === 0}
              loading={sendFeedback.isPending}
            >
              Enviar
            </Button>
          </div>
        </div>
      </Card>
    </section>
  );
}
