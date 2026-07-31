import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellIcon } from '../../components/ui/icons';
import { targetPath, timeAgo, type NotificationBlock, type NotificationItem } from './api';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from './useNotifications';

const ICON_BTN_CLASS =
  'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-sm text-ink transition-colors duration-200 ease-out hover:bg-brand-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand';

// Centro de notificaciones (S34, D1): panel desplegable desde la campanita, no página propia.
// Sin backdrop (no bloquea la app): se cierra clickeando afuera o con Esc, igual que el menú
// de la persona.
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { data } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const unread = data?.unreadCount ?? 0;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  // D3: abrir = marcar leída. El movimiento del bot abre el editor de la transacción.
  const openItem = (item: NotificationItem) => {
    setOpen(false);
    if (!item.read) markRead.mutate(item.id);
    const path = targetPath(item);
    if (path) navigate(path);
  };

  const hasAny = Boolean(
    data &&
      (data.movements.recent.length > 0 ||
        data.movements.older.length > 0 ||
        data.alerts.recent.length > 0 ||
        data.alerts.older.length > 0),
  );

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={unread === 0 ? 'Notificaciones' : `Notificaciones, ${unread} sin leer`}
        className={ICON_BTN_CLASS}
      >
        <BellIcon className="h-5 w-5" />
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute right-1.5 top-1.5 min-w-4 rounded-full bg-expense px-1 text-center text-xs font-semibold leading-4 text-[#ffffff]"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notificaciones"
          className="absolute right-0 top-full z-50 mt-1 max-h-[70vh] w-80 overflow-y-auto rounded-md border border-line bg-surface-elevated p-1 shadow-md"
        >
          <div className="flex items-center justify-between gap-2 px-2 py-1.5">
            <span className="text-sm font-semibold text-ink">Notificaciones</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markAll.mutate()}
                className="rounded-sm px-1 text-xs text-brand transition-colors duration-200 ease-out hover:underline"
              >
                Marcar todas leídas
              </button>
            )}
          </div>

          {!data || !hasAny ? (
            <p className="px-2 py-3 text-sm text-muted">Todavía no hay nada por acá.</p>
          ) : (
            <>
              <Block title="Movimientos" block={data.movements} onOpen={openItem} />
              <Block title="Alertas" block={data.alerts} onOpen={openItem} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

type BlockProps = {
  title: string;
  block: NotificationBlock;
  onOpen: (item: NotificationItem) => void;
};

// D4: lo viejo y ya visto se colapsa en una fila expandible. El bloque entero desaparece si no
// tiene nada (un panel con dos títulos vacíos no informa nada).
function Block({ title, block, onOpen }: BlockProps) {
  const [expanded, setExpanded] = useState(false);

  if (block.recent.length === 0 && block.older.length === 0) return null;

  return (
    <section className="border-t border-line pt-1 first-of-type:border-t-0">
      <h3 className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted">
        {title}
      </h3>

      {block.recent.map((item) => (
        <Row key={item.id} item={item} onOpen={onOpen} />
      ))}

      {block.older.length > 0 && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex min-h-11 w-full items-center rounded-sm px-2 text-sm text-muted transition-colors duration-200 ease-out hover:bg-brand-bg hover:text-ink"
        >
          {block.older.length === 1 ? '+ 1 anterior' : `+ ${block.older.length} anteriores`}
        </button>
      )}

      {expanded && block.older.map((item) => (
        <Row key={item.id} item={item} onOpen={onOpen} />
      ))}
    </section>
  );
}

function Row({ item, onOpen }: { item: NotificationItem; onOpen: (item: NotificationItem) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className="flex w-full flex-col items-start gap-0.5 rounded-sm px-2 py-2 text-left transition-colors duration-200 ease-out hover:bg-brand-bg"
    >
      <span className="flex w-full items-start gap-2">
        {!item.read && (
          <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
        )}
        <span
          className={[
            'flex-1 text-sm',
            item.read ? 'text-body' : 'font-medium text-ink',
          ].join(' ')}
        >
          {item.title}
        </span>
      </span>
      {item.body && (
        <span className="whitespace-pre-line pl-4 text-xs text-muted">{item.body}</span>
      )}
      <span className="pl-4 text-xs text-muted">{timeAgo(item.createdAt)}</span>
    </button>
  );
}
