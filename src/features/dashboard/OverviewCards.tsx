import { formatMoney } from '../../lib/money';
import { StatCard } from './StatCard';
import type { CurrencyOverview } from './api';

type OverviewCardsProps = {
  overview: CurrencyOverview;
};

export function OverviewCards({ overview }: OverviewCardsProps) {
  const { currency, totalBalance, monthIncome, monthExpense, formalBalance, informalBalance } =
    overview;
  const savings = monthIncome - monthExpense;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        label="Balance total"
        amount={totalBalance}
        currency={currency}
        tone="neutral"
        secondary={
          informalBalance !== 0
            ? `Formal ${formatMoney(formalBalance, currency)} · Informal ${formatMoney(informalBalance, currency)}`
            : undefined
        }
      />
      <StatCard label="Ingresos del mes" amount={monthIncome} currency={currency} tone="income" />
      <StatCard label="Gastos del mes" amount={monthExpense} currency={currency} tone="expense" />
      <StatCard
        label="Ahorro del mes"
        amount={savings}
        currency={currency}
        tone={savings >= 0 ? 'income' : 'expense'}
      />
    </div>
  );
}
