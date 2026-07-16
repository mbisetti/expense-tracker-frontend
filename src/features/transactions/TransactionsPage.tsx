import { useEffect, useMemo, useState } from 'react';
import { useAccounts } from '../accounts/useAccounts';
import { useCategories } from '../categories/useCategories';
import { useTransactions } from './useTransactions';
import { useDeleteTransaction } from './useTransactionMutations';
import { transactionErrorMessage } from './errorMessages';
import { TransactionForm } from './TransactionForm';
import { useTransfers } from '../transfers/useTransfers';
import { useDeleteTransfer } from '../transfers/useTransferMutations';
import { transferErrorMessage } from '../transfers/errorMessages';
import { TransferForm } from '../transfers/TransferForm';
import { Select } from '../../components/ui/Select';
import { DateField } from '../../components/ui/DateField';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Amount } from '../../components/ui/Amount';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/toastContext';
import type { TransactionFilters, TransactionListItem, TransactionType } from './api';
import type { TransferListItem } from '../transfers/api';

const PAGE_SIZE = 20;
// Traemos un lote generoso de cada fuente y paginamos/mergeamos en el cliente: para una app
// personal el volumen es chico y esto evita el problema de paginar dos tablas en el server.
const FETCH_SIZE = 100;

// El filtro de tipo del feed unificado suma 'TRANSFER' (Entre cuentas) a los de transacción.
type MovementTypeFilter = '' | 'INCOME' | 'EXPENSE' | 'TRANSFER';
type NewMovementKind = 'EXPENSE' | 'INCOME' | 'TRANSFER';

type MovementRow =
  | { kind: 'tx'; item: TransactionListItem }
  | { kind: 'transfer'; item: TransferListItem };

const NEW_KIND_OPTIONS: { value: NewMovementKind; label: string }[] = [
  { value: 'EXPENSE', label: 'Gasto' },
  { value: 'INCOME', label: 'Ingreso' },
  { value: 'TRANSFER', label: 'Entre cuentas' },
];

export function TransactionsPage() {
  const [accountId, setAccountId] = useState('');
  const [type, setType] = useState<MovementTypeFilter>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [newKind, setNewKind] = useState<NewMovementKind>('EXPENSE');
  const [editing, setEditing] = useState<TransactionListItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ kind: 'tx' | 'transfer'; id: string } | null>(
    null,
  );

  const toast = useToast();
  const deleteTx = useDeleteTransaction();
  const deleteTransfer = useDeleteTransfer();

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  // Cualquier cambio de filtro vuelve a la primera página
  const setFilter = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(0);
  };
  const changeAccount = setFilter(setAccountId);
  const changeType = setFilter(setType);
  const changeDateFrom = setFilter(setDateFrom);
  const changeDateTo = setFilter(setDateTo);

  // Las transacciones se filtran server-side (menos las patas de transfer, ocultas por
  // excludeTransferLegs). El tipo 'INCOME'/'EXPENSE' también va al server; con 'TRANSFER'
  // o '' se traen todas las transacciones (las transferencias se mergean aparte).
  const filters: TransactionFilters = useMemo(
    () => ({
      excludeTransferLegs: true,
      accountId: accountId || undefined,
      type: type === 'INCOME' || type === 'EXPENSE' ? type : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      search: search || undefined,
      page: 0,
      size: FETCH_SIZE,
    }),
    [accountId, type, dateFrom, dateTo, search],
  );

  const { data: txData, isPending: txPending, isError: txError, isPlaceholderData } =
    useTransactions(filters);
  const { data: transfersData, isPending: transfersPending, isError: transfersError } =
    useTransfers(0, FETCH_SIZE);
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();

  const accountName = (id: string) => accounts?.find((a) => a.id === id)?.name ?? '—';
  const accountCurrency = (id: string) => accounts?.find((a) => a.id === id)?.currency ?? '';
  const categoryName = (id: string | null) =>
    id ? categories?.find((c) => c.id === id)?.name ?? '—' : '—';

  // Feed unificado: transacciones (sin patas) + transferencias, mergeadas y ordenadas por
  // fecha desc (tiebreak createdAt, id). Los filtros que el server ya aplicó a las tx se
  // replican client-side sobre las transferencias para que el resultado sea coherente.
  const movements = useMemo<MovementRow[]>(() => {
    const txItems = type === 'TRANSFER' ? [] : txData?.content ?? [];
    const transferItems =
      type === 'INCOME' || type === 'EXPENSE'
        ? []
        : (transfersData?.content ?? []).filter((t) => {
            if (accountId && t.fromAccountId !== accountId && t.toAccountId !== accountId)
              return false;
            if (dateFrom && t.date < dateFrom) return false;
            if (dateTo && t.date > dateTo) return false;
            if (search && !(t.description ?? '').toLowerCase().includes(search.toLowerCase()))
              return false;
            return true;
          });

    const rows: MovementRow[] = [
      ...txItems.map((item) => ({ kind: 'tx' as const, item })),
      ...transferItems.map((item) => ({ kind: 'transfer' as const, item })),
    ];
    rows.sort((a, b) => {
      if (a.item.date !== b.item.date) return a.item.date < b.item.date ? 1 : -1;
      if (a.item.createdAt !== b.item.createdAt) return a.item.createdAt < b.item.createdAt ? 1 : -1;
      return a.item.id < b.item.id ? 1 : -1;
    });
    return rows;
  }, [txData, transfersData, type, accountId, dateFrom, dateTo, search]);

  const totalPages = Math.max(1, Math.ceil(movements.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = movements.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const isPending = txPending || transfersPending;
  const isError = txError || transfersError;

  const openCreate = () => {
    setEditing(null);
    setNewKind('EXPENSE');
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const startEdit = (tx: TransactionListItem) => {
    setEditing(tx);
    setFormOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!confirmDelete) return;
    const done = () => setConfirmDelete(null);
    if (confirmDelete.kind === 'tx') {
      deleteTx.mutate(confirmDelete.id, {
        onSuccess: () => toast.success('Transacción borrada.'),
        onError: (error) => toast.error(transactionErrorMessage(error)),
        onSettled: done,
      });
    } else {
      deleteTransfer.mutate(confirmDelete.id, {
        onSuccess: () => toast.success('Transferencia borrada.'),
        onError: (error) => toast.error(transferErrorMessage(error)),
        onSettled: done,
      });
    }
  };

  return (
    <section className="flex flex-col gap-4 text-left">
      <h1>Transacciones</h1>

      {accounts && accounts.length > 0 && (
        <p aria-label="Balances" className="flex flex-wrap gap-x-2 gap-y-1 text-sm text-body">
          {accounts.map((account, i) => (
            <span key={account.id}>
              {i > 0 && ' · '}
              {account.name}:{' '}
              <Amount amount={account.balance} currency={account.currency} tone="neutral" size="sm" />
            </span>
          ))}
        </p>
      )}

      {!formOpen && (
        <Button type="button" onClick={openCreate}>
          Nuevo movimiento
        </Button>
      )}

      {formOpen && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {editing ? (
              <span className="text-sm font-medium text-ink">Editar transacción</span>
            ) : (
              <div role="group" aria-label="Tipo de movimiento" className="flex flex-wrap gap-2">
                {NEW_KIND_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    size="sm"
                    variant={newKind === option.value ? 'primary' : 'secondary'}
                    onClick={() => setNewKind(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            )}
            <Button type="button" variant="ghost" size="sm" onClick={closeForm}>
              Cerrar
            </Button>
          </div>

          {editing || newKind !== 'TRANSFER' ? (
            <TransactionForm
              key={editing?.id ?? `new-${newKind}`}
              transaction={editing ?? undefined}
              lockedType={editing ? undefined : (newKind as TransactionType)}
              onClose={closeForm}
            />
          ) : (
            <TransferForm />
          )}
        </div>
      )}

      <form
        aria-label="Filtros"
        onSubmit={(e) => e.preventDefault()}
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
      >
        <Select
          label="Cuenta"
          id="filter-account"
          value={accountId}
          onChange={(e) => changeAccount(e.target.value)}
        >
          <option value="">Todas</option>
          {accounts?.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </Select>

        <Select
          label="Tipo"
          id="filter-type"
          value={type}
          onChange={(e) => changeType(e.target.value as MovementTypeFilter)}
        >
          <option value="">Todos</option>
          <option value="INCOME">Ingreso</option>
          <option value="EXPENSE">Gasto</option>
          <option value="TRANSFER">Entre cuentas</option>
        </Select>

        <DateField
          label="Desde"
          id="filter-date-from"
          value={dateFrom}
          onChange={(e) => changeDateFrom(e.target.value)}
        />

        <DateField
          label="Hasta"
          id="filter-date-to"
          value={dateTo}
          onChange={(e) => changeDateTo(e.target.value)}
        />

        <Input
          label="Buscar"
          id="filter-search"
          type="search"
          placeholder="Descripción..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </form>

      {isPending && <Skeleton variant="list" rows={8} />}

      {isError && (
        <p role="alert" className="text-expense">
          No pudimos cargar las transacciones. Intentá de nuevo.
        </p>
      )}

      {!isPending && !isError && movements.length === 0 && (
        <EmptyState
          title="No hay transacciones para mostrar."
          actionLabel={page > 0 ? 'Volver a la primera página' : undefined}
          onAction={page > 0 ? () => setPage(0) : undefined}
        />
      )}

      {movements.length > 0 && (
        <>
          <div className={`overflow-x-auto ${isPlaceholderData ? 'opacity-60' : ''}`}>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-muted">
                  <th className="py-2 pr-2 font-medium">Fecha</th>
                  <th className="py-2 pr-2 font-medium">Tipo</th>
                  <th className="py-2 pr-2 font-medium">Descripción</th>
                  <th className="py-2 pr-2 font-medium">Categoría</th>
                  <th className="py-2 pr-2 font-medium">Cuenta</th>
                  <th className="py-2 pr-2 font-medium">Monto</th>
                  <th className="py-2 pr-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) =>
                  row.kind === 'tx' ? (
                    <tr key={`tx-${row.item.id}`} className="border-b border-line">
                      <td className="py-2 pr-2 tabular-nums text-ink">{row.item.date}</td>
                      <td className="py-2 pr-2 text-body">
                        {row.item.type === 'INCOME' ? 'Ingreso' : 'Gasto'}
                      </td>
                      <td className="py-2 pr-2 text-ink">{row.item.description ?? '—'}</td>
                      <td className="py-2 pr-2 text-body">{categoryName(row.item.categoryId)}</td>
                      <td className="py-2 pr-2 text-body">{accountName(row.item.accountId)}</td>
                      <td className="py-2 pr-2">
                        <Amount
                          amount={row.item.amount}
                          currency={row.item.currency}
                          tone={row.item.type === 'INCOME' ? 'income' : 'expense'}
                          size="sm"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <div className="flex gap-2">
                          <Button type="button" variant="ghost" size="sm" onClick={() => startEdit(row.item)}>
                            Editar
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmDelete({ kind: 'tx', id: row.item.id })}
                          >
                            Borrar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={`tr-${row.item.id}`} className="border-b border-line">
                      <td className="py-2 pr-2 tabular-nums text-ink">{row.item.date}</td>
                      <td className="py-2 pr-2">
                        <Badge status="info" label="Entre cuentas" />
                      </td>
                      <td className="py-2 pr-2 text-ink">{row.item.description ?? '—'}</td>
                      <td className="py-2 pr-2 text-body">—</td>
                      <td className="py-2 pr-2 text-body">
                        {accountName(row.item.fromAccountId)} → {accountName(row.item.toAccountId)}
                      </td>
                      <td className="py-2 pr-2">
                        <Amount
                          amount={row.item.fromAmount}
                          currency={accountCurrency(row.item.fromAccountId)}
                          tone="neutral"
                          size="sm"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmDelete({ kind: 'transfer', id: row.item.id })}
                        >
                          Borrar
                        </Button>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>

          <nav aria-label="Paginación" className="flex items-center gap-3 text-sm">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
            >
              Anterior
            </Button>
            <span className="text-body">
              Página {safePage + 1} de {totalPages} ({movements.length} movimientos)
            </span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={safePage + 1 >= totalPages}
            >
              Siguiente
            </Button>
          </nav>
        </>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        danger
        title={confirmDelete?.kind === 'transfer' ? 'Borrar transferencia' : 'Borrar transacción'}
        message="Esta acción no se puede deshacer."
        confirmLabel="Borrar"
        loading={deleteTx.isPending || deleteTransfer.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </section>
  );
}
