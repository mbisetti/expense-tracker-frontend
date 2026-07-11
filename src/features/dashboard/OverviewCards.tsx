import { formatMoney } from '../../lib/money';
import { StatCard } from './StatCard';
import type { CurrencyOverview } from './api';

type OverviewCardsProps = {
  overview: CurrencyOverview;
};

export function OverviewCards({ overview }: OverviewCardsProps) {
  const { currency, totalBalance, monthIncome, monthExpense } = overview;
  const savings = monthIncome - monthExpense;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard label="Balance total" value={formatMoney(totalBalance, currency)} tone="neutral" />
      <StatCard label="Ingresos del mes" value={formatMoney(monthIncome, currency)} tone="income" />
      <StatCard label="Gastos del mes" value={formatMoney(monthExpense, currency)} tone="expense" />
      <StatCard
        label="Ahorro del mes"
        value={formatMoney(savings, currency)}
        tone={savings >= 0 ? 'income' : 'expense'}
      />
    </div>
  );
}
