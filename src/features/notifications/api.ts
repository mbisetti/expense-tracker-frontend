// Centro de notificaciones (S34). El catálogo de tipos vive en el BACK (label y bloque vienen
// en la respuesta de prefs): acá `type` es string a propósito, así un tipo nuevo no necesita
// deploy del front para aparecer en Ajustes.

/** A dónde lleva el tap. El back manda el tipo de destino; el front traduce a ruta. */
export type NotificationTargetType =
  | 'TRANSACTION'
  | 'BUDGETS'
  | 'RECURRING'
  | 'CARD'
  | 'SHARED'
  | 'SAVINGS'
  | 'INCOME'
  | 'EXPENSES';

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  targetType: NotificationTargetType | null;
  targetId: string | null;
  createdAt: string;
  read: boolean;
};

export type NotificationBlock = {
  /** Lo de la ventana de acumulación + todo lo no leído. */
  recent: NotificationItem[];
  /** Lo viejo y ya visto: colapsado detrás de "+ N anteriores". */
  older: NotificationItem[];
  unreadCount: number;
};

export type NotificationsResponse = {
  unreadCount: number;
  accumulationDays: number;
  movements: NotificationBlock;
  alerts: NotificationBlock;
};

export type NotificationTypePref = {
  type: string;
  label: string;
  block: 'MOVEMENTS' | 'ALERTS';
  inApp: boolean;
  telegram: boolean;
};

export type NotificationPrefs = {
  accumulationDays: number;
  types: NotificationTypePref[];
};

// D3: el movimiento del bot abre la transacción PARA EDITAR. El resto lleva a su pantalla.
export function targetPath(item: NotificationItem): string | null {
  switch (item.targetType) {
    case 'TRANSACTION':
      return item.targetId ? `/transactions?edit=${item.targetId}` : '/transactions';
    // Presupuestos y ahorros viven en el Overview, no en páginas propias.
    case 'BUDGETS':
    case 'SAVINGS':
      return '/dashboard';
    case 'RECURRING':
      return '/expenses#recurrentes';
    case 'SHARED':
      return '/expenses#compartidos';
    case 'CARD':
      return '/accounts';
    // S36 (FR-7/D4): con UNA sola fuente pendiente la notificación trae su id y abre el confirm
    // de esa fuente. Con varias no hay a cuál apuntar y lleva a la página, donde están los ticks.
    case 'INCOME':
      return item.targetId ? `/income?confirm=${item.targetId}` : '/income';
    case 'EXPENSES':
      return '/expenses';
    default:
      return null;
  }
}

// "hace 5 min" / "hace 3 h" / "hace 2 días". Sin librería de fechas (el proyecto no tiene) y
// sin segundos: una notificación recién nacida dice "recién".
export function timeAgo(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const minutes = Math.floor((now.getTime() - then) / 60000);
  if (minutes < 1) return 'recién';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'hace 1 día' : `hace ${days} días`;
}
