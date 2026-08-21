import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/toastContext';
import { formatMoney } from '../../lib/money';
import { formatDate, useDateFormat } from '../../lib/dateFormat';
import { useAccounts } from '../accounts/useAccounts';
import { useCategories } from '../categories/useCategories';
import { usePaymentMethods } from '../paymentMethods/usePaymentMethods';
import { useTransactions } from './useTransactions';
import {
  useMarkReviewed,
  useMarkReviewedBulk,
  useUpdateTransaction,
} from './useTransactionMutations';
import { transactionErrorMessage } from './errorMessages';
import type { TransactionListItem } from './api';

// S38 — la bandeja de "por revisar".
//
// Lo que entra solo llega con lo que la fuente dijo y nada más: la descripción del banco, sin
// categoría propia, sin método de pago. Queda bien en el ledger y mal en los informes hasta que
// alguien lo acomoda, y acomodarlo desde el feed general es buscar una aguja entre meses de
// movimientos.
//
// La lista se vacía SOLA a medida que editás: tocaste la fila, ya la miraste, sale y le deja
// lugar a las otras. No hay que confirmar dos veces lo mismo.

const ORIGIN_LABEL: Record<string, string> = {
  IMPORT: 'del archivo',
  BOT: 'lo anotó Thoth',
  TELEGRAM_IMPORT: 'lo leyó Thoth',
  AUTO_DEBIT: 'débito automático',
  MANUAL: 'a mano',
};

export function ReviewInbox() {
  const { pref } = useDateFormat();
  const toast = useToast();
  const { data, isPending } = useTransactions({ pendingReview: true, size: 100 });
  const { data: categories } = useCategories();
  const { data: accounts } = useAccounts();
  const markAll = useMarkReviewedBulk();

  const rows = data?.content ?? [];

  if (isPending) {
    return <Skeleton variant="list" rows={4} />;
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No hay nada para revisar"
        message="Acá aparece lo que entra solo: lo que importás de un PDF y lo que anotás por Telegram. Se va de la lista a medida que lo acomodás."
      />
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          Entraron solos y todavía no los miraste. Poneles categoría o cambiales la descripción, y
          cada uno sale de la lista.
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          loading={markAll.isPending}
          onClick={() =>
            markAll.mutate(
              rows.map((row) => row.id),
              { onError: (error) => toast.error(transactionErrorMessage(error)) },
            )
          }
        >
          Están todos bien ({rows.length})
        </Button>
      </div>

      <div className="overflow-auto rounded-sm border border-line">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="sticky top-0 z-10 bg-surface text-left text-xs text-muted">
            <tr>
              <th className="w-24 px-2 py-1.5 font-medium">Fecha</th>
              <th className="px-2 py-1.5 font-medium">Descripción</th>
              <th className="w-44 px-2 py-1.5 font-medium">Categoría</th>
              <th className="w-40 px-2 py-1.5 font-medium">Método</th>
              <th className="w-32 px-2 py-1.5 text-right font-medium">Monto</th>
              <th className="w-24 px-2 py-1.5 font-medium"> </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <InboxRow
                key={row.id}
                row={row}
                pref={pref}
                categories={categories ?? []}
                accountName={accounts?.find((a) => a.id === row.accountId)?.name ?? ''}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function InboxRow({
  row,
  pref,
  categories,
  accountName,
}: {
  row: TransactionListItem;
  pref: 'ar' | 'us';
  categories: { id: string; name: string; type: string }[];
  accountName: string;
}) {
  const toast = useToast();
  const update = useUpdateTransaction();
  const markReviewed = useMarkReviewed();
  const { data: paymentMethods } = usePaymentMethods(row.accountId);

  // La descripción se escribe libre y se guarda al salir del campo: guardar en cada tecla sería
  // un PATCH por letra, y cada PATCH saca la fila de la lista.
  const [description, setDescription] = useState(row.description ?? '');

  const options = categories.filter((c) => c.type === 'BOTH' || c.type === row.type);
  const busy = update.isPending || markReviewed.isPending;

  const save = (changes: Parameters<typeof update.mutate>[0]['changes']) =>
    update.mutate(
      { id: row.id, changes },
      { onError: (error) => toast.error(transactionErrorMessage(error)) },
    );

  return (
    <tr className={busy ? 'opacity-50' : undefined}>
      <td className="whitespace-nowrap px-2 py-1.5 align-top tabular-nums">
        {formatDate(row.date, pref)}
        <span className="block text-xs text-muted">{ORIGIN_LABEL[row.origin ?? ''] ?? ''}</span>
      </td>
      <td className="px-2 py-1.5 align-top">
        <input
          type="text"
          aria-label={`Descripción de ${row.description ?? 'el movimiento'}`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => {
            if (description !== (row.description ?? '')) save({ description });
          }}
          className="w-full rounded-sm border border-transparent bg-transparent px-1 py-0.5 hover:border-line focus:border-accent focus:outline-none"
        />
        {accountName && <span className="text-xs text-muted">{accountName}</span>}
      </td>
      <td className="px-2 py-1.5 align-top">
        <select
          aria-label={`Categoría de ${row.description ?? 'el movimiento'}`}
          value={row.categoryId ?? ''}
          onChange={(e) => save({ categoryId: e.target.value })}
          className="w-full rounded-sm border border-transparent bg-transparent px-1 py-0.5 hover:border-line focus:border-accent focus:outline-none"
        >
          <option value="">Sin categoría</option>
          {options.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </td>
      <td className="px-2 py-1.5 align-top">
        {(paymentMethods ?? []).length === 0 ? (
          <span className="text-xs text-muted">—</span>
        ) : (
          <select
            aria-label={`Método de pago de ${row.description ?? 'el movimiento'}`}
            value={row.paymentMethodId ?? ''}
            onChange={(e) => save({ paymentMethodId: e.target.value })}
            className="w-full rounded-sm border border-transparent bg-transparent px-1 py-0.5 hover:border-line focus:border-accent focus:outline-none"
          >
            <option value="">Sin método</option>
            {(paymentMethods ?? []).map((method) => (
              <option key={method.id} value={method.id}>
                {method.name}
              </option>
            ))}
          </select>
        )}
      </td>
      <td className="whitespace-nowrap px-2 py-1.5 text-right align-top tabular-nums">
        {row.type === 'EXPENSE' ? '-' : ''}
        {formatMoney(row.amount, row.currency)}
        {row.sharedAmount > 0 && <Badge status="info" label="compartido" className="ml-1" />}
      </td>
      <td className="px-2 py-1.5 align-top">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={busy}
          onClick={() =>
            markReviewed.mutate(row.id, {
              onError: (error) => toast.error(transactionErrorMessage(error)),
            })
          }
        >
          Está bien
        </Button>
      </td>
    </tr>
  );
}
