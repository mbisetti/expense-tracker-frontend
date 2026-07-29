import { useEffect, useMemo, useRef, useState } from 'react';
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
import { ExportTransactionsButton } from '../export/ExportTransactionsButton';
import { Select } from '../../components/ui/Select';
import { DateField } from '../../components/ui/DateField';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Amount } from '../../components/ui/Amount';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EditButton } from '../../components/ui/ActionsMenu';
import { SharedInfoButton } from '../shared/SharedInfoButton';
import { useToast } from '../../components/ui/toastContext';
import { formatDate, useDateFormat } from '../../lib/dateFormat';
import { formatMoney } from '../../lib/money';
import { SharedExpenseModal } from '../shared/SharedExpenseModal';
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
  // V36: deep-link desde el empty state de Compartidos (Gastos) — abre el alta de gasto con el
  // reparto ya activado. Se lee una sola vez, como el resto de los params (no se sincroniza).
  const initialNew = searchParams.get('new');
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
  const [formOpen, setFormOpen] = useState(() => initialNew === 'shared');
  const [newKind, setNewKind] = useState<NewMovementKind>('EXPENSE');
  // Sólo el primer alta (el deep-linkeado) arranca con el reparto activado; cualquier acción
  // posterior (cambiar de tipo, cerrar, reabrir) lo apaga.
  const [startShared, setStartShared] = useState(() => initialNew === 'shared');
  const [editing, setEditing] = useState<TransactionListItem | null>(null);
  const [editingTransfer, setEditingTransfer] = useState<TransferListItem | null>(null);
  // V36: settledCount viaja en el confirm para poder avisar cuántos cobros se van a arrastrar
  // (D9) sin abrir el detalle.
  const [confirmDelete, setConfirmDelete] = useState<{
    kind: 'tx' | 'transfer';
    id: string;
    settledCount?: number;
  } | null>(null);
  const [sharedDetail, setSharedDetail] = useState<string | null>(null);

  const toast = useToast();
  const { pref: dateFmt } = useDateFormat();
  const deleteTx = useDeleteTransaction();
  const deleteTransfer = useDeleteTransfer();

  // Llevar la vista al form cuando se abre (o cuando se pasa a editar otra fila). Efecto
  // legítimo: sincroniza el DOM con el estado, no setea estado. `?.()` porque jsdom no
  // implementa scrollIntoView y los tests lo llamarían igual.
  const formRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!formOpen) return;
    formRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    formRef.current?.focus?.({ preventScroll: true });
  }, [formOpen, editing?.id, editingTransfer?.id]);

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

  // Sprint 26: los mismos filtros, mapeados al contrato de /export/transactions. El tipo
  // "Entre cuentas" del feed no existe como TransactionType → viaja como onlyTransferLegs.
  const exportFilters = useMemo(
    () => ({
      accountId: accountId || undefined,
      type: type === 'INCOME' || type === 'EXPENSE' ? type : undefined,
      onlyTransferLegs: type === 'TRANSFER' ? true : undefined,
      categoryId:
        type !== 'TRANSFER' && categoryId && categoryId !== CATEGORY_NONE ? categoryId : undefined,
      uncategorized: type !== 'TRANSFER' && categoryId === CATEGORY_NONE ? true : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      search: search || undefined,
    }),
    [accountId, type, categoryId, dateFrom, dateTo, search],
  );
  const hasFilters = Boolean(accountId || type || categoryId || dateFrom || dateTo || search);

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
    setStartShared(false);
    setFormOpen(true);
  };

  // El selector de tipo (Gasto/Ingreso/Entre cuentas): al cambiarlo se apaga el pre-activado del
  // reparto — venías del deep-link "repartir un gasto" y elegiste otra cosa.
  const changeNewKind = (kind: NewMovementKind) => {
    setNewKind(kind);
    setStartShared(false);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setEditingTransfer(null);
    setStartShared(false);
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
        // El borrado ahora se dispara desde DENTRO del form de edición → al confirmar hay que
        // cerrarlo, o queda editando algo que ya no existe.
        onSuccess: () => {
          toast.success('Transacción borrada.');
          closeForm();
        },
        onError: (error) => toast.error(transactionErrorMessage(error)),
        onSettled: done,
      });
    } else {
      deleteTransfer.mutate(confirmDelete.id, {
        onSuccess: () => {
          toast.success('Transferencia borrada.');
          closeForm();
        },
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
        // tabIndex={-1} para poder enfocarlo: el form vive arriba de todo y el lápiz puede
        // haberse clickeado en la última fila de la página. Sin esto el usuario queda abajo
        // editando algo que no ve. Enfocar además de scrollear hace que el próximo Tab entre al
        // form y que un lector de pantalla anuncie el cambio de contexto.
        <div ref={formRef} tabIndex={-1} className="flex flex-col gap-3 outline-none">
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
                    onClick={() => changeNewKind(option.value)}
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
            <TransferForm
              key={editingTransfer.id}
              transfer={editingTransfer}
              onDone={closeForm}
              onDelete={() => setConfirmDelete({ kind: 'transfer', id: editingTransfer.id })}
            />
          ) : editing || newKind !== 'TRANSFER' ? (
            <TransactionForm
              key={editing?.id ?? `new-${newKind}`}
              transaction={editing ?? undefined}
              lockedType={editing ? undefined : (newKind as TransactionType)}
              initialShared={!editing && startShared}
              onClose={closeForm}
              // El aviso de la cascada necesita cuántos cobros hay: se calcula acá, donde está
              // la fila con los conteos, y no dentro del form.
              onDelete={
                editing
                  ? () =>
                      setConfirmDelete({
                        kind: 'tx',
                        id: editing.id,
                        settledCount: editing.shareCount - editing.pendingCount,
                      })
                  : undefined
              }
            />
          ) : (
            <TransferForm />
          )}
        </div>
      )}

      {/* Sprint 26: exportar lo que estás viendo (o todo) a .xlsx. */}
      <div className="flex justify-end">
        <ExportTransactionsButton filters={exportFilters} hasFilters={hasFilters} />
      </div>

      <form
        aria-label="Filtros"
        onSubmit={(e) => e.preventDefault()}
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
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
          {/* El scroll horizontal sólo hace falta por debajo del min-w de la tabla (mobile). En
              desktop se apaga: `overflow-x-auto` crea un contexto de recorte que le cortaría el
              globito del tooltip a las últimas filas. En mobile no hay hover, así que no se pierde
              nada. */}
          <div className={`overflow-x-auto lg:overflow-visible ${isPlaceholderData ? 'opacity-60' : ''}`}>
            <table className="w-full min-w-[48rem] table-fixed border-collapse text-sm">
              {/* Sprint 23 (D3): una línea por celda — todo `whitespace-nowrap` salvo la
                  descripción, que trunca con tooltip (title). +8px de aire (pr-4). El wrapper
                  scrollea en horizontal. D10: la columna Fecha con la voz de los montos. */}
              {/* Anchos fijos por columna (table-fixed): con layout automático la Descripción y
                  la Cuenta estiraban la tabla más allá del contenedor y la columna de acciones
                  quedaba fuera del área visible. Ahora Descripción se queda con el sobrante y
                  trunca; el resto tiene ancho declarado. `min-w` mantiene el scroll horizontal
                  del wrapper SÓLO en pantallas angostas (mobile), como antes. */}
              <colgroup>
                <col className="w-[6.5rem]" />
                {/* Tipo: 7rem y no 5.5 — tiene que entrar "Ingreso" + la ⓘ del gasto compartido
                    sin desbordar. El espacio sale de Descripción, que es la que tiene holgura. */}
                <col className="w-[7rem]" />
                <col />
                <col className="w-[8rem]" />
                <col className="w-[10rem]" />
                <col className="w-[8.5rem]" />
                {/* Acciones: un solo lápiz de 44px (target táctil) + aire. */}
                <col className="w-14" />
              </colgroup>
              <thead>
                <tr className="border-b border-line text-left text-muted">
                  <th className="whitespace-nowrap py-2 pr-4 font-medium">Fecha</th>
                  <th className="whitespace-nowrap py-2 pr-4 font-medium">Tipo</th>
                  <th className="py-2 pr-4 font-medium">Descripción</th>
                  <th className="whitespace-nowrap py-2 pr-4 font-medium">Categoría</th>
                  <th className="whitespace-nowrap py-2 pr-4 font-medium">Cuenta</th>
                  <th className="whitespace-nowrap py-2 pr-4 font-medium">Monto</th>
                  <th className="py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) =>
                  row.kind === 'tx' ? (
                    <tr key={`tx-${row.item.id}`} className="border-b border-line">
                      <td className="whitespace-nowrap py-2 pr-4 font-semibold tabular-nums text-ink">
                        {formatDate(row.item.date, dateFmt)}
                      </td>
                      <td className="py-2 pr-4 text-body">
                        <div className="flex items-center gap-1.5">
                          <span className="whitespace-nowrap">
                            {row.item.type === 'INCOME' ? 'Ingreso' : 'Gasto'}
                          </span>
                          {/* V36: el detalle del reparto, a la derecha del tipo — un gasto
                              compartido es una variante de "Gasto", y acá el ícono queda fuera
                              del texto libre de la descripción (que trunca y movía su posición). */}
                          {row.item.sharedAmount > 0 && (
                            <SharedInfoButton
                              label="Ver detalle del gasto compartido"
                              text={`Gasto compartido: pagaste el total y te deben una parte. Tocá para ver el reparto de ${row.item.description ? `«${row.item.description}»` : 'este gasto'}.`}
                              onClick={() => setSharedDetail(row.item.id)}
                            />
                          )}
                          {/* La contracara: este ingreso es la devolución de un gasto compartido.
                              El tooltip nombra el gasto y el click lleva a su reparto — desde el
                              feed, "Cobro" solo no dice de qué. */}
                          {row.item.settledExpenseId && (
                            <SharedInfoButton
                              label="Ver el gasto compartido que originó este cobro"
                              text={`Te devolvieron tu parte de ${
                                row.item.settledExpenseDescription
                                  ? `«${row.item.settledExpenseDescription}»`
                                  : 'un gasto compartido'
                              }. Suma al saldo pero no cuenta como ingreso del mes. Tocá para ver el reparto.`}
                              onClick={() => setSharedDetail(row.item.settledExpenseId!)}
                            />
                          )}
                        </div>
                      </td>
                      <td className="py-2 pr-4 text-ink">
                        <div className="flex items-center gap-1.5">
                          <div className="truncate" title={row.item.description ?? ''}>
                            {row.item.description ?? '—'}
                            {/* V36: cuánta gente todavía no te pagó. Desaparece cuando no queda
                                nadie — no se muestra un "(0 restantes)" colgado. */}
                            {row.item.pendingCount > 0 && (
                              <span className="text-muted">
                                {' '}
                                ({row.item.pendingCount}{' '}
                                {row.item.pendingCount === 1 ? 'restante' : 'restantes'})
                              </span>
                            )}
                          </div>
                          {/* Sprint 24.4: generada por el débito automático. */}
                          {row.item.autoGenerated && <Badge status="info" label="Auto" />}
                          {/* El chip "Cobro" vivía acá: su ícono era otra ⓘ, pero muda — no
                              explicaba ni llevaba a ningún lado. Lo reemplaza la ⓘ de la columna
                              Tipo, que sí hace las dos cosas; la descripción del cobro ya dice
                              "Cobro de {persona} — {gasto}". */}
                        </div>
                        {/* V36: lo que realmente gastaste vos — es este número el que va a
                            categorías y presupuestos, no el total de la derecha. */}
                        {row.item.sharedAmount > 0 && (
                          <div className="truncate text-xs text-muted">
                            Te corresponde{' '}
                            <span className="tabular-nums">
                              {formatMoney(row.item.amount - row.item.sharedAmount, row.item.currency)}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="truncate py-2 pr-4 text-body">
                        {categoryName(row.item.categoryId)}
                      </td>
                      <td className="truncate py-2 pr-4 text-body">
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
                      {/* Sólo el lápiz: "Borrar" se mudó DENTRO del form de edición (patrón de
                          Cuentas/Categorías/Métodos, S21 t4) y la ⓘ, al lado de la descripción. */}
                      <td className="py-2">
                        <EditButton label="movimiento" onClick={() => startEdit(row.item)} />
                      </td>
                    </tr>
                  ) : (
                    // Las filas de transferencia SIEMPRE ocupan dos renglones (cuenta + monedas),
                    // así que llevan py-4 en vez de py-2: +16px de alto, dentro del tope de 32px.
                    <tr key={`tr-${row.item.id}`} className="border-b border-line">
                      <td className="whitespace-nowrap py-4 pr-4 font-semibold tabular-nums text-ink">
                        {formatDate(row.item.date, dateFmt)}
                      </td>
                      {/* "Entre / cuentas" en dos renglones: en una sola línea forzaba el ancho de
                          la columna. Minúscula en "cuentas" para no divergir del filtro de Tipo. */}
                      <td className="py-4 pr-4 leading-tight text-body">
                        Entre
                        <br />
                        cuentas
                      </td>
                      <td className="py-4 pr-4 text-ink">
                        <div className="truncate" title={row.item.description ?? ''}>
                          {row.item.description ?? '—'}
                        </div>
                      </td>
                      <td className="py-4 pr-4 text-body">—</td>
                      {/* Sprint 23 (D5): dos líneas — origen · moneda / destino · moneda.
                          Intra-cuenta (misma cuenta, cambio de moneda): también dos renglones,
                          nombre arriba y el par de monedas abajo apagado — antes era una sola
                          línea `Cuenta · ARS → USD` que estiraba la columna. */}
                      <td className="py-4 pr-4 text-body">
                        {row.item.fromAccountId === row.item.toAccountId ? (
                          <div className="flex flex-col leading-tight">
                            <span className="truncate">{accountName(row.item.fromAccountId)}</span>
                            <span className="truncate text-muted">
                              {row.item.fromCurrency} → {row.item.toCurrency}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col leading-tight">
                            <span className="truncate">
                              {accountName(row.item.fromAccountId)} · {row.item.fromCurrency}
                            </span>
                            <span className="truncate text-muted">
                              {accountName(row.item.toAccountId)} · {row.item.toCurrency}
                            </span>
                          </div>
                        )}
                      </td>
                      {/* Cross-currency apila los dos montos: en una línea no entra en la columna
                          de ancho fijo y se derramaba sobre la de acciones. */}
                      <td className="py-4 pr-4">
                        <div className="flex flex-col leading-tight tabular-nums">
                          <Amount
                            amount={row.item.fromAmount}
                            currency={row.item.fromCurrency}
                            tone="neutral"
                            size="sm"
                          />
                          {row.item.fromCurrency !== row.item.toCurrency && (
                            <span className="text-muted">
                              →{' '}
                              <Amount
                                amount={row.item.toAmount}
                                currency={row.item.toCurrency}
                                tone="neutral"
                                size="sm"
                              />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4">
                        <EditButton
                          label="transferencia"
                          onClick={() => startEditTransfer(row.item)}
                        />
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
        // V36 (D9): borrar un gasto compartido arrastra los cobros ya registrados y devuelve el
        // saldo de las cuentas. Se avisa ANTES, con el número puesto.
        message={
          confirmDelete?.settledCount
            ? `Este gasto tiene ${confirmDelete.settledCount} ${
                confirmDelete.settledCount === 1 ? 'cobro registrado' : 'cobros registrados'
              }. También se ${confirmDelete.settledCount === 1 ? 'borra' : 'borran'} y el saldo de tus cuentas vuelve atrás.`
            : 'Esta acción no se puede deshacer.'
        }
        confirmLabel="Borrar"
        loading={deleteTx.isPending || deleteTransfer.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      {sharedDetail && (
        <SharedExpenseModal
          open
          transactionId={sharedDetail}
          onClose={() => setSharedDetail(null)}
        />
      )}
    </section>
  );
}
