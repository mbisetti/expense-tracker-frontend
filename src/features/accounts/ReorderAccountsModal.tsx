import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Modal } from '../../components/ui/Modal';
import { MenuIcon } from '../../components/ui/icons';
import { useReorderAccounts } from './useAccountMutations';
import { TYPE_LABELS } from './typeLabels';
import type { Account } from './api';

type ReorderAccountsModalProps = {
  open: boolean;
  /** Cuentas top-level en el orden actual. */
  accounts: Account[];
  onClose: () => void;
};

// Sprint 22.4: reordenar cuentas top-level con drag & drop. La lista (con su estado de drag)
// se monta al abrir el modal → arranca siempre del orden persistido actual, sin useEffect de
// sincronización (evita el set-state-in-effect).
export function ReorderAccountsModal({ open, accounts, onClose }: ReorderAccountsModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Ordenar cuentas">
      {open && <ReorderList accounts={accounts} />}
    </Modal>
  );
}

// Pointer events a mano (sin dependencia): el handle captura el puntero y, según la Y del
// cursor contra el punto medio de cada fila, mueve la cuenta arrastrada. Al soltar se
// persiste el orden completo. Los PUT se SERIALIZAN (chain de promesas): drops rápidos no
// generan requests en paralelo que el server podría recibir desordenados.
function ReorderList({ accounts }: { accounts: Account[] }) {
  const [order, setOrder] = useState<Account[]>(accounts);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const orderRef = useRef<Account[]>(accounts);
  const listRef = useRef<HTMLUListElement>(null);
  const reorder = useReorderAccounts();
  const chain = useRef<Promise<unknown>>(Promise.resolve());

  function applyLive(next: Account[]) {
    orderRef.current = next;
    setOrder(next);
  }

  function onPointerDown(e: ReactPointerEvent<HTMLButtonElement>, id: string) {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDraggingId(id);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    if (!draggingId || !listRef.current) return;
    const rows = Array.from(listRef.current.children) as HTMLElement[];
    const y = e.clientY;
    let target = rows.length - 1;
    for (let i = 0; i < rows.length; i++) {
      const rect = rows[i].getBoundingClientRect();
      if (y < rect.top + rect.height / 2) {
        target = i;
        break;
      }
    }
    const from = orderRef.current.findIndex((a) => a.id === draggingId);
    if (from !== -1 && from !== target) {
      const next = [...orderRef.current];
      const [moved] = next.splice(from, 1);
      next.splice(target, 0, moved);
      applyLive(next);
    }
  }

  function onPointerUp() {
    if (!draggingId) return;
    setDraggingId(null);
    const ids = orderRef.current.map((a) => a.id);
    // Serializa: cada drop espera al anterior; siempre manda la lista completa actual.
    chain.current = chain.current.then(() => reorder.mutateAsync(ids)).catch(() => {});
  }

  return (
    <ul ref={listRef} className="m-0 flex list-none flex-col gap-1 p-0">
      {order.map((account) => (
        <li
          key={account.id}
          className={`flex items-center gap-3 rounded-md border px-2 py-2 ${
            draggingId === account.id ? 'border-brand bg-brand-bg' : 'border-line'
          }`}
        >
          <button
            type="button"
            aria-label={`Mover ${account.name}`}
            onPointerDown={(e) => onPointerDown(e, account.id)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className="flex shrink-0 cursor-grab touch-none items-center text-muted active:cursor-grabbing"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm text-body">{account.name}</span>
            <span className="truncate text-xs text-muted">
              {TYPE_LABELS[account.type]}
              {account.institution ? ` · ${account.institution}` : ''}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
