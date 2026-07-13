import { Link } from 'react-router-dom';
import { Card } from '../../components/Card';
import { amountSign, amountToneClass, formatMoney } from '../../lib/money';
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
        <Link to="/transactions" className="text-brand text-sm">
          Ver todas
        </Link>
      </div>

      {transactions.length === 0 ? (
        <p>Todavía no hay transacciones.</p>
      ) : (
        <ul className="list-none p-0 m-0 divide-y divide-line">
          {transactions.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 py-2">
              <div>
                <p className="text-ink">{t.description || 'Sin descripción'}</p>
                <p className="text-body text-sm">{formatDate(t.date)}</p>
              </div>
              <p className={`tabular-nums ${amountToneClass(t.type)}`}>
                {amountSign(t.type)}
                {formatMoney(t.amount, t.currency)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
