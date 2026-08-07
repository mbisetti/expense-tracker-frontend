import { Button } from '../../components/ui/Button';
import {
  actionsFor,
  adjustLabel,
  QUICK_ACTION_LABELS,
  TRADE_LABEL,
  type LabelledQuickAction,
  type QuickAction,
} from './quickActions';
import type { Account } from './api';

type AccountQuickActionsProps = {
  account: Account;
  onAction: (action: QuickAction) => void;
};

// S40 (D4): la fila de acciones de la card, entre el sparkline y "Últimos movimientos".
//
// Hasta S39 INVESTMENT/CRYPTO/DEBT eran etiquetas sin ninguna lógica propia: la card de una
// cuenta de inversión se veía igual que la de una caja de ahorro. Esta fila es lo primero que
// las distingue.
//
// Las transferencias abren el FORM DE SIEMPRE prellenado (no se reinventa ninguno): así
// cross-currency, cotización sugerida y guards vienen gratis. Sólo el ajuste tiene diálogo
// propio, porque no es una transferencia — es decir cuánto vale algo.
export function AccountQuickActions({ account, onAction }: AccountQuickActionsProps) {
  const actions = actionsFor(account);
  if (actions.length === 0) return null;

  // Grupo centrado con gap parejo, mismo criterio que las botoneras de los formularios. Con
  // `gap-2` y alineado a la izquierda, las cuatro acciones de una cripto se amontonaban contra
  // el borde y en pantalla angosta la que se caía de línea quedaba sola y descolgada.
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {actions.map((action) => (
        <Button
          key={action}
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onAction(action)}
        >
          {action === 'adjust'
            ? adjustLabel(account)
            : action === 'trade'
              ? TRADE_LABEL
              : QUICK_ACTION_LABELS[action as LabelledQuickAction]}
        </Button>
      ))}
    </div>
  );
}
