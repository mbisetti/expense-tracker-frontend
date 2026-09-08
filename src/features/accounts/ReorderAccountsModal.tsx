import { useRef, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { ReorderList } from '../../components/ui/ReorderList';
import { useReorderAccounts } from './useAccountMutations';
import { TYPE_LABELS } from './typeLabels';
import type { Account } from './api';

type ReorderAccountsModalProps = {
  open: boolean;
  /** Cuentas top-level en el orden actual. */
  accounts: Account[];
  onClose: () => void;
};

// Sprint 22.4: reordenar cuentas top-level con drag & drop. La lista (con su estado) se monta al
// abrir el modal → arranca siempre del orden persistido actual, sin useEffect de sincronización
// (evita el set-state-in-effect). El drag vive en ReorderList (extraído en S48, compartido con
// categorías); acá queda lo propio de cuentas: guardar en cada drop.
export function ReorderAccountsModal({ open, accounts, onClose }: ReorderAccountsModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Ordenar cuentas">
      {open && <ReorderAccounts accounts={accounts} />}
    </Modal>
  );
}

// Los PUT se SERIALIZAN (chain de promesas): drops rápidos no generan requests en paralelo
// que el server podría recibir desordenados. El orden local es optimista: se aplica al soltar
// y no espera la respuesta.
function ReorderAccounts({ accounts }: { accounts: Account[] }) {
  const [order, setOrder] = useState<Account[]>(accounts);
  const reorder = useReorderAccounts();
  const chain = useRef<Promise<unknown>>(Promise.resolve());

  function handleMove(next: Account[]) {
    setOrder(next);
    // Serializa: cada drop espera al anterior; siempre manda la lista completa actual.
    chain.current = chain.current
      .then(() => reorder.mutateAsync(next.map((a) => a.id)))
      .catch(() => {});
  }

  return (
    <ReorderList
      items={order}
      getId={(account) => account.id}
      getLabel={(account) => account.name}
      onMove={handleMove}
      renderRow={(account) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm text-body">{account.name}</span>
          <span className="truncate text-xs text-muted">
            {TYPE_LABELS[account.type]}
            {account.institution ? ` · ${account.institution}` : ''}
          </span>
        </div>
      )}
    />
  );
}
