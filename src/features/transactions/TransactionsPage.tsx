import { useEffect, useMemo, useState } from 'react';
import { useAccounts } from '../accounts/useAccounts';
import { useCategories } from '../categories/useCategories';
import { useTransactions } from './useTransactions';
import { useDeleteTransaction } from './useTransactionMutations';
import { transactionErrorMessage } from './errorMessages';
import { TransactionForm } from './TransactionForm';
import { Select } from '../../components/ui/Select';
import { DateField } from '../../components/ui/DateField';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Amount } from '../../components/ui/Amount';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/toastContext';
import type { TransactionFilters, TransactionListItem, TransactionType } from './api';

const PAGE_SIZE = 20;

export function TransactionsPage() {
  const [accountId, setAccountId] = useState('');
  const [type, setType] = useState<TransactionType | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TransactionListItem | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const toast = useToast();
  const deleteMutation = useDeleteTransaction();

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

  const filters: TransactionFilters = useMemo(
    () => ({
      accountId: accountId || undefined,
      type: type || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      search: search || undefined,
      page,
      size: PAGE_SIZE,
    }),
    [accountId, type, dateFrom, dateTo, search, page],
  );

  const { data, isPending, isError, isPlaceholderData } = useTransactions(filters);
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();

  const accountName = (id: string) =>
    accounts?.find((a) => a.id === id)?.name ?? '—';

  const categoryName = (id: string | null) =>
    id ? categories?.find((c) => c.id === id)?.name ?? '—' : '—';

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const startEdit = (tx: TransactionListItem) => {
    setEditing(tx);
    setFormOpen(true);
  };

  const confirmDelete = () => {
    if (!confirmingDeleteId) return;
    deleteMutation.mutate(confirmingDeleteId, {
      onSuccess: () => toast.success('Transacción borrada.'),
      onError: (error) => toast.error(transactionErrorMessage(error)),
      onSettled: () => setConfirmingDeleteId(null),
    });
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
        <Button type="button" onClick={() => setFormOpen(true)}>
          Nueva transacción
        </Button>
      )}

      {formOpen && (
        <TransactionForm
          key={editing?.id ?? 'new'}
          transaction={editing ?? undefined}
          onClose={closeForm}
        />
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
          onChange={(e) => changeType(e.target.value as TransactionType | '')}
        >
          <option value="">Todos</option>
          <option value="INCOME">Ingreso</option>
          <option value="EXPENSE">Gasto</option>
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

      {data && data.content.length === 0 && (
        <EmptyState
          title="No hay transacciones para mostrar."
          actionLabel={page > 0 ? 'Volver a la primera página' : undefined}
          onAction={page > 0 ? () => setPage(0) : undefined}
        />
      )}

      {data && data.content.length > 0 && (
        <>
          <div className={isPlaceholderData ? 'opacity-60' : ''}>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-muted">
                  <th className="py-2 pr-2 font-medium">Fecha</th>
                  <th className="py-2 pr-2 font-medium">Descripción</th>
                  <th className="py-2 pr-2 font-medium">Categoría</th>
                  <th className="py-2 pr-2 font-medium">Cuenta</th>
                  <th className="py-2 pr-2 font-medium">Monto</th>
                  <th className="py-2 pr-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {data.content.map((tx) => (
                  <tr key={tx.id} className="border-b border-line">
                    <td className="py-2 pr-2 tabular-nums text-ink">{tx.date}</td>
                    <td className="py-2 pr-2 text-ink">{tx.description ?? '—'}</td>
                    <td className="py-2 pr-2 text-body">{categoryName(tx.categoryId)}</td>
                    <td className="py-2 pr-2 text-body">{accountName(tx.accountId)}</td>
                    <td className="py-2 pr-2">
                      <Amount
                        amount={tx.amount}
                        currency={tx.currency}
                        tone={tx.type === 'INCOME' ? 'income' : 'expense'}
                        size="sm"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <div className="flex gap-2">
                        <Button type="button" variant="ghost" size="sm" onClick={() => startEdit(tx)}>
                          Editar
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmingDeleteId(tx.id)}
                        >
                          Borrar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <nav aria-label="Paginación" className="flex items-center gap-3 text-sm">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 0}
            >
              Anterior
            </Button>
            <span className="text-body">
              Página {data.page + 1} de {data.totalPages} ({data.totalElements}{' '}
              transacciones)
            </span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page + 1 >= data.totalPages}
            >
              Siguiente
            </Button>
          </nav>
        </>
      )}

      <ConfirmDialog
        open={confirmingDeleteId !== null}
        danger
        title="Borrar transacción"
        message="Esta acción no se puede deshacer."
        confirmLabel="Borrar"
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmingDeleteId(null)}
      />
    </section>
  );
}
