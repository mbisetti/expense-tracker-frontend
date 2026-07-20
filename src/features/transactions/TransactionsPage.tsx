import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/toastContext';
import { formatDate, useDateFormat } from '../../lib/dateFormat';
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

// Sprint 24.2 (D6): sentinel del filtro "Sin categoría" (→ uncategorized=true server-side).
const CATEGORY_NONE = 'none';

export function TransactionsPage() {
  // Sprint 24.2 (D6): los filtros se inicializan desde los query params UNA vez (deep-link
  // desde Gastos). No se sincroniza de vuelta al navegar/filtrar (v1; back/forward no re-aplica).
  const [searchParams] = useSearchParams();
  const [accountId, setAccountId] = useState(() => searchParams.get('accountId') ?? '');
  const [type, setType] = useState<MovementTypeFilter>(() => {
    const t = searchParams.get('type');
    return t === 'INCOME' || t === 'EXPENSE' || t === 'TRANSFER' ? t : '';
  });
  const [categoryId, setCategoryId] = useState(() =>
    searchParams.get('uncategorized') === 'true'
      ? CATEGORY_NONE
      : (searchParams.get('categoryId') ?? ''),
  );
  const [dateFrom, setDateFrom] = useState(() => searchParams.get('dateFrom') ?? '');
  const [dateTo, setDateTo] = useState(() => searchParams.get('dateTo') ?? '');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [newKind, setNewKind] = useState<NewMovementKind>('EXPENSE');
  const [editing, setEditing] = useState<TransactionListItem | null>(null);
  const [editingTransfer, setEditingTransfer] = useState<TransferListItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ kind: 'tx' | 'transfer'; id: string } | null>(
    null,
  );

  const toast = useToast();
  const { pref: dateFmt } = useDateFormat();
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
  const changeCategory = setFilter(setCategoryId);
  const changeDateFrom = setFilter(setDateFrom);
  const changeDateTo = setFilter(setDateTo);

  // El tipo resetea la categoría si queda incompatible (D2): TRANSFER no admite categoría;
  // pasar a INCOME/EXPENSE descarta una categoría del otro tipo (BOTH siempre sirve).
  const changeType = (value: MovementTypeFilter) => {
    setType(value);
    setPage(0);
    if (value === 'TRANSFER') {
      setCategoryId('');
      return;
    }
    if (categoryId && value !== '') {
      const cat = categories?.find((c) => c.id === categoryId);
      if (cat && cat.type !== 'BOTH' && cat.type !== value) setCategoryId('');
    }
  };

  // Las transacciones se filtran server-side (menos las patas de transfer, ocultas por
  // excludeTransferLegs). El tipo 'INCOME'/'EXPENSE' también va al server; con 'TRANSFER'
  // o '' se traen todas las transacciones (las transferencias se mergean aparte).
  const filters: TransactionFilters = useMemo(
    () => ({
      excludeTransferLegs: true,
      accountId: accountId || undefined,
      type: type === 'INCOME' || type === 'EXPENSE' ? type : undefined,
      // Sprint 23 (D2): categoría server-side; TRANSFER no lleva. S24.2 (D6): el sentinel
      // 'none' va como uncategorized=true (NO categoryId). undefined para apagado (nunca false).
      categoryId:
        type !== 'TRANSFER' && categoryId && categoryId !== CATEGORY_NONE ? categoryId : undefined,
      uncategorized: type !== 'TRANSFER' && categoryId === CATEGORY_NONE ? true : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      search: search || undefined,
      page: 0,
      size: FETCH_SIZE,
    }),
    [accountId, type, categoryId, dateFrom, dateTo, search],
  );

  const { data: txData, isPending: txPending, isError: txError, isPlaceholderData } =
    useTransactions(filters);
  const { data: transfersData, isPending: transfersPending, isError: transfersError } =
    useTransfers(0, FETCH_SIZE);
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();

  const accountName = (id: string) => accounts?.find((a) => a.id === id)?.name ?? '—';
  const categoryName = (id: string | null) =>
    id ? categories?.find((c) => c.id === id)?.name ?? '—' : '—';

  // Sprint 23 (D2): opciones del filtro de categoría según el Tipo elegido (BOTH sirve para
  // INCOME y EXPENSE; con Tipo vacío se listan todas).
  const filterCategories = categories?.filter((c) => {
    if (type === 'INCOME') return c.type === 'INCOME' || c.type === 'BOTH';
    if (type === 'EXPENSE') return c.type === 'EXPENSE' || c.type === 'BOTH';
    return true;
  });

  // Feed unificado: transacciones (sin patas) + transferencias, mergeadas y ordenadas por
  // fecha desc (tiebreak createdAt, id). Los filtros que el server ya aplicó a las tx se
  // replican client-side sobre las transferencias para que el resultado sea coherente.
  const movements = useMemo<MovementRow[]>(() => {
    const txItems = type === 'TRANSFER' ? [] : txData?.content ?? [];
    // Con categoría activa (D2) las transferencias se excluyen: un transfer no matchea categoría.
    const transferItems =
      type === 'INCOME' || type === 'EXPENSE' || categoryId
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
  }, [txData, transfersData, type, categoryId, accountId, dateFrom, dateTo, search]);

  const totalPages = Math.max(1, Math.ceil(movements.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = movements.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const isPending = txPending || transfersPending;
  const isError = txError || transfersError;

  const openCreate = () => {
    setEditing(null);
    setEditingTransfer(null);
    setNewKind('EXPENSE');
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setEditingTransfer(null);
  };

  const startEdit = (tx: TransactionListItem) => {
    setEditingTransfer(null);
    setEditing(tx);
    setFormOpen(true);
  };

  // Sprint 23 (D4): editar una transferencia desde el feed (abre el TransferForm en modo edición).
  const startEditTransfer = (t: TransferListItem) => {
    setEditing(null);
    setEditingTransfer(t);
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

      {/* Sprint 23 (D9): chips de cuenta con scroll horizontal — reemplazan el texto de saldos
          y filtran el feed al tocarlos (mismo estado que el select "Cuenta"). Universo = TODAS
          las cuentas (incluidas las CREDIT vinculadas: filtrar por tarjeta es legítimo). El saldo
          del chip es el de la principal; los sub-balances por moneda viven en Cuentas. */}
      {accounts && accounts.length > 0 && (
        <div
          role="group"
          aria-label="Filtrar por cuenta"
          className="flex gap-2 overflow-x-auto pb-1"
        >
          {accounts.map((account) => {
            const active = accountId === account.id;
            return (
              <button
                key={account.id}
                type="button"
                aria-pressed={active}
                onClick={() => changeAccount(active ? '' : account.id)}
                className={[
                  'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors',
                  active
                    ? 'border-brand bg-brand/10 text-ink'
                    : 'border-line text-body hover:border-brand',
                ].join(' ')}
              >
                <span className="whitespace-nowrap">{account.name}</span>
                <Amount amount={account.balance} currency={account.currency} tone="neutral" size="sm" />
              </button>
            );
          })}
        </div>
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
            ) : editingTransfer ? (
              <span className="text-sm font-medium text-ink">Editar transferencia</span>
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

          {editingTransfer ? (
            <TransferForm key={editingTransfer.id} transfer={editingTransfer} onDone={closeForm} />
          ) : editing || newKind !== 'TRANSFER' ? (
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
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6"
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

        {/* Sprint 23 (D2): filtro de categoría. Opciones según el Tipo; con "Entre cuentas"
            se deshabilita (un transfer no tiene categoría). */}
        <Select
          label="Categoría"
          id="filter-category"
          value={categoryId}
          onChange={(e) => changeCategory(e.target.value)}
          disabled={type === 'TRANSFER'}
        >
          <option value="">Todas</option>
          {/* Sprint 24.2 (D6): filtra las transacciones sin categoría (uncategorized server-side). */}
          <option value={CATEGORY_NONE}>— Sin categoría —</option>
          {filterCategories?.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
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
              {/* Sprint 23 (D3): una línea por celda — todo `whitespace-nowrap` salvo la
                  descripción, que trunca con tooltip (title). +8px de aire (pr-4). El wrapper
                  scrollea en horizontal. D10: la columna Fecha con la voz de los montos. */}
              <thead>
                <tr className="border-b border-line text-left text-muted">
                  <th className="whitespace-nowrap py-2 pr-4 font-medium">Fecha</th>
                  <th className="whitespace-nowrap py-2 pr-4 font-medium">Tipo</th>
                  <th className="py-2 pr-4 font-medium">Descripción</th>
                  <th className="whitespace-nowrap py-2 pr-4 font-medium">Categoría</th>
                  <th className="whitespace-nowrap py-2 pr-4 font-medium">Cuenta</th>
                  <th className="whitespace-nowrap py-2 pr-4 font-medium">Monto</th>
                  <th className="py-2 pr-4 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) =>
                  row.kind === 'tx' ? (
                    <tr key={`tx-${row.item.id}`} className="border-b border-line">
                      <td className="whitespace-nowrap py-2 pr-4 font-semibold tabular-nums text-ink">
                        {formatDate(row.item.date, dateFmt)}
                      </td>
                      <td className="whitespace-nowrap py-2 pr-4 text-body">
                        {row.item.type === 'INCOME' ? 'Ingreso' : 'Gasto'}
                      </td>
                      <td className="py-2 pr-4 text-ink">
                        <div className="max-w-[28ch] truncate" title={row.item.description ?? ''}>
                          {row.item.description ?? '—'}
                        </div>
                      </td>
                      <td className="whitespace-nowrap py-2 pr-4 text-body">
                        {categoryName(row.item.categoryId)}
                      </td>
                      <td className="whitespace-nowrap py-2 pr-4 text-body">
                        {accountName(row.item.accountId)}
                      </td>
                      <td className="whitespace-nowrap py-2 pr-4">
                        <Amount
                          amount={row.item.amount}
                          currency={row.item.currency}
                          tone={row.item.type === 'INCOME' ? 'income' : 'expense'}
                          size="sm"
                        />
                      </td>
                      <td className="whitespace-nowrap py-2 pr-4">
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
                      <td className="whitespace-nowrap py-2 pr-4 font-semibold tabular-nums text-ink">
                        {formatDate(row.item.date, dateFmt)}
                      </td>
                      <td className="whitespace-nowrap py-2 pr-4 text-body">Entre cuentas</td>
                      <td className="py-2 pr-4 text-ink">
                        <div className="max-w-[28ch] truncate" title={row.item.description ?? ''}>
                          {row.item.description ?? '—'}
                        </div>
                      </td>
                      <td className="whitespace-nowrap py-2 pr-4 text-body">—</td>
                      {/* Sprint 23 (D5): dos líneas — origen · moneda / destino · moneda.
                          Intra-cuenta → una línea `Cuenta · ARS → USD` (Sprint 22). */}
                      <td className="py-2 pr-4 text-body">
                        {row.item.fromAccountId === row.item.toAccountId ? (
                          <span className="whitespace-nowrap">
                            {accountName(row.item.fromAccountId)} · {row.item.fromCurrency} →{' '}
                            {row.item.toCurrency}
                          </span>
                        ) : (
                          <div className="flex flex-col leading-tight">
                            <span className="whitespace-nowrap">
                              {accountName(row.item.fromAccountId)} · {row.item.fromCurrency}
                            </span>
                            <span className="whitespace-nowrap text-muted">
                              {accountName(row.item.toAccountId)} · {row.item.toCurrency}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap py-2 pr-4">
                        <span className="tabular-nums">
                          <Amount
                            amount={row.item.fromAmount}
                            currency={row.item.fromCurrency}
                            tone="neutral"
                            size="sm"
                          />
                          {row.item.fromCurrency !== row.item.toCurrency && (
                            <>
                              {' → '}
                              <Amount
                                amount={row.item.toAmount}
                                currency={row.item.toCurrency}
                                tone="neutral"
                                size="sm"
                              />
                            </>
                          )}
                        </span>
                      </td>
                      <td className="whitespace-nowrap py-2 pr-4">
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditTransfer(row.item)}
                          >
                            Editar
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmDelete({ kind: 'transfer', id: row.item.id })}
                          >
                            Borrar
                          </Button>
                        </div>
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
