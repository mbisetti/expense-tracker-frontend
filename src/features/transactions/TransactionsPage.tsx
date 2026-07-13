import { useEffect, useMemo, useState } from 'react';
import { amountSign, formatMoney } from '../../lib/money';
import { useAccounts } from '../accounts/useAccounts';
import { useCategories } from '../categories/useCategories';
import { useTransactions } from './useTransactions';
import { useDeleteTransaction } from './useTransactionMutations';
import { transactionErrorMessage } from './errorMessages';
import { TransactionForm } from './TransactionForm';
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

  const formatAmount = (amount: number, currency: string, txType: TransactionType) =>
    amountSign(txType) + formatMoney(amount, currency);

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const startEdit = (tx: TransactionListItem) => {
    setEditing(tx);
    setFormOpen(true);
  };

  const confirmDelete = (id: string) => {
    deleteMutation.mutate(id, { onSettled: () => setConfirmingDeleteId(null) });
  };

  return (
    <section>
      <h1>Transacciones</h1>

      {accounts && accounts.length > 0 && (
        <p aria-label="Balances">
          {accounts.map((account, i) => (
            <span key={account.id}>
              {i > 0 && ' · '}
              {account.name}: <strong>{formatMoney(account.balance, account.currency)}</strong>
            </span>
          ))}
        </p>
      )}

      {!formOpen && (
        <button type="button" onClick={() => setFormOpen(true)}>
          Nueva transacción
        </button>
      )}

      {formOpen && (
        <TransactionForm
          key={editing?.id ?? 'new'}
          transaction={editing ?? undefined}
          onClose={closeForm}
        />
      )}

      <form aria-label="Filtros" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="filter-account">Cuenta</label>
        <select
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
        </select>

        <label htmlFor="filter-type">Tipo</label>
        <select
          id="filter-type"
          value={type}
          onChange={(e) => changeType(e.target.value as TransactionType | '')}
        >
          <option value="">Todos</option>
          <option value="INCOME">Ingreso</option>
          <option value="EXPENSE">Gasto</option>
        </select>

        <label htmlFor="filter-date-from">Desde</label>
        <input
          id="filter-date-from"
          type="date"
          value={dateFrom}
          onChange={(e) => changeDateFrom(e.target.value)}
        />

        <label htmlFor="filter-date-to">Hasta</label>
        <input
          id="filter-date-to"
          type="date"
          value={dateTo}
          onChange={(e) => changeDateTo(e.target.value)}
        />

        <label htmlFor="filter-search">Buscar</label>
        <input
          id="filter-search"
          type="search"
          placeholder="Descripción..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </form>

      {isPending && <p>Cargando transacciones...</p>}

      {isError && (
        <p role="alert">No pudimos cargar las transacciones. Intentá de nuevo.</p>
      )}

      {deleteMutation.isError && (
        <p role="alert">{transactionErrorMessage(deleteMutation.error)}</p>
      )}

      {data && data.content.length === 0 && (
        <>
          <p>No hay transacciones para mostrar.</p>
          {page > 0 && (
            <button type="button" onClick={() => setPage(0)}>
              Volver a la primera página
            </button>
          )}
        </>
      )}

      {data && data.content.length > 0 && (
        <>
          <table style={{ opacity: isPlaceholderData ? 0.6 : 1 }}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Descripción</th>
                <th>Categoría</th>
                <th>Cuenta</th>
                <th>Monto</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.content.map((tx) => (
                <tr key={tx.id}>
                  <td>{tx.date}</td>
                  <td>{tx.description ?? '—'}</td>
                  <td>{categoryName(tx.categoryId)}</td>
                  <td>{accountName(tx.accountId)}</td>
                  <td>{formatAmount(tx.amount, tx.currency, tx.type)}</td>
                  <td>
                    {confirmingDeleteId === tx.id ? (
                      <>
                        ¿Borrar?{' '}
                        <button
                          type="button"
                          onClick={() => confirmDelete(tx.id)}
                          disabled={deleteMutation.isPending}
                        >
                          Sí
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingDeleteId(null)}
                          disabled={deleteMutation.isPending}
                        >
                          No
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => startEdit(tx)}>
                          Editar
                        </button>
                        <button type="button" onClick={() => setConfirmingDeleteId(tx.id)}>
                          Borrar
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <nav aria-label="Paginación">
            <button
              type="button"
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 0}
            >
              Anterior
            </button>
            <span>
              Página {data.page + 1} de {data.totalPages} ({data.totalElements}{' '}
              transacciones)
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={page + 1 >= data.totalPages}
            >
              Siguiente
            </button>
          </nav>
        </>
      )}
    </section>
  );
}
