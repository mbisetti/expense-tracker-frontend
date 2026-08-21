import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { Switch } from '../../components/ui/Switch';
import { useToast } from '../../components/ui/toastContext';
import type { NotificationTypePref } from './api';
import {
  toggledChannels,
  useNotificationPrefs,
  useUpdateNotificationPrefs,
} from './useNotifications';

const ACCUMULATION_OPTIONS = [1, 3, 7];

// Ajustes → Notificaciones (D5): qué recibir y por dónde. Los tipos y sus etiquetas los manda
// el back: agregar un tipo nuevo no toca este archivo.
export function NotificationsSection() {
  const toast = useToast();
  const { data: prefs } = useNotificationPrefs();
  const update = useUpdateNotificationPrefs();

  // Sin catálogo de tipos no hay nada que configurar (back viejo o respuesta rara): la sección
  // no existe, mismo criterio que la del bot cuando no hay bot.
  const types = prefs?.types ?? [];
  if (types.length === 0) return null;

  const change = (body: Parameters<typeof update.mutate>[0]) => {
    update.mutate(body, {
      onError: () => toast.error('No se pudieron guardar las notificaciones.'),
    });
  };

  const movements = types.filter((t) => t.block === 'MOVEMENTS');
  const alerts = types.filter((t) => t.block === 'ALERTS');

  return (
    <Card>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col">
          <h2 className="text-lg font-semibold text-ink">Notificaciones</h2>
          <span className="text-sm text-muted">
            Qué te avisamos y por dónde. In-app es la campanita; Telegram te lo manda Thoth.
          </span>
        </div>

        <Group title="Movimientos" types={movements} onChange={change} />
        <Group title="Alertas" types={alerts} onChange={change} />

        <Select
          label="Acumular notificaciones por"
          id="notification-accumulation"
          value={String(prefs?.accumulationDays ?? 3)}
          onChange={(e) => change({ accumulationDays: Number(e.target.value) })}
          helper="Pasado ese tiempo, las que ya viste se agrupan en una sola fila."
        >
          {ACCUMULATION_OPTIONS.map((days) => (
            <option key={days} value={days}>
              {days === 1 ? '1 día' : `${days} días`}
            </option>
          ))}
        </Select>
      </div>
    </Card>
  );
}

type GroupProps = {
  title: string;
  types: NotificationTypePref[];
  onChange: (body: { types: Record<string, { inApp: boolean; telegram: boolean }> }) => void;
};

function Group({ title, types, onChange }: GroupProps) {
  if (types.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h3>
      {types.map((pref) => (
        <div key={pref.type} className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-ink">{pref.label}</span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">In-app</span>
              <Switch
                checked={pref.inApp}
                ariaLabel={`${pref.label}, in-app`}
                onChange={(value) => onChange({ types: toggledChannels(pref, 'inApp', value) })}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">Telegram</span>
              <Switch
                checked={pref.telegram}
                ariaLabel={`${pref.label}, Telegram`}
                onChange={(value) => onChange({ types: toggledChannels(pref, 'telegram', value) })}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
