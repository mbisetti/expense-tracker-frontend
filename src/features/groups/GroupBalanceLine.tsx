import { Amount } from '../../components/ui/Amount';
import type { GroupBalanceAmount } from './api';

type GroupBalanceLineProps = {
  balance: GroupBalanceAmount[];
  /** Texto cuando está todo en cero. */
  settledLabel?: string;
};

// El saldo de una persona en un grupo, por moneda y sin consolidar nunca.
//
// El signo manda el copy: positivo es plata que te deben, negativo es plata que debés. El monto se
// muestra siempre en positivo con la palabra al lado, porque "te deben -5.000" no se entiende.
export function GroupBalanceLine({ balance, settledLabel = 'Están a mano' }: GroupBalanceLineProps) {
  if (balance.length === 0) {
    return <p className="text-sm text-muted">{settledLabel}</p>;
  }

  return (
    <ul className="flex flex-col gap-1">
      {balance.map((item) => (
        <li key={item.currency} className="flex items-baseline gap-2 text-sm">
          <span className="text-muted">{item.net > 0 ? 'Te deben' : 'Debés'}</span>
          <Amount
            amount={Math.abs(item.net)}
            currency={item.currency}
            tone={item.net > 0 ? 'income' : 'expense'}
            size="sm"
          />
        </li>
      ))}
    </ul>
  );
}
