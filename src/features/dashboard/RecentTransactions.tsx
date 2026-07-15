import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Amount } from '../../components/ui/Amount';
import { EmptyState } from '../../components/ui/EmptyState';
import type { TransactionListItem } from '../transactions/api';

type RecentTransactionsProps = {
  transactions: TransactionListItem[];
};

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
  });
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <h2>Últimos movimientos</h2>
        <Link to="/transactions" className="text-sm text-brand">
          Ver todas
        </Link>
      </div>

      {transactions.length === 0 ? (
        <EmptyState
          title="Todavía no hay transacciones"
          message="Registrá tu primer movimiento para verlo acá."
        />
      ) : (
        <ul className="m-0 list-none divide-y divide-line p-0">
          {transactions.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 py-2">
              <div>
                <p className="text-ink">{t.description || 'Sin descripción'}</p>
                <p className="text-sm text-body">{formatDate(t.date)}</p>
              </div>
              <Amount
                amount={t.amount}
                currency={t.currency}
                tone={t.type === 'INCOME' ? 'income' : 'expense'}
                size="sm"
              />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
