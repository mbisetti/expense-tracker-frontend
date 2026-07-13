import { ProgressBar } from '../../components/ProgressBar';
import { formatMoney } from '../../lib/money';
import { useSavingsGoals } from './useSavingsGoals';

function PlaceholderRow() {
  return (
    <div className="flex flex-col gap-2">
      <div className="h-4 w-40 bg-line rounded" />
      <div className="h-2 bg-line rounded-full" />
    </div>
  );
}

function formatDeadline(deadline: string): string {
  return new Date(deadline + 'T00:00:00').toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function isPastDeadline(deadline: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(deadline + 'T00:00:00') < today;
}

export function SavingsGoalSection() {
  const { data, isPending, isError } = useSavingsGoals();

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <h2>Objetivos de ahorro</h2>

      {isPending && (
        <div role="status" aria-label="Cargando objetivos" className="flex flex-col gap-3 animate-pulse">
          <PlaceholderRow />
          <PlaceholderRow />
          <PlaceholderRow />
        </div>
      )}

      {isError && (
        <p role="alert">No pudimos cargar los objetivos de ahorro. Intentá de nuevo.</p>
      )}

      {data && data.length === 0 && <p>Todavía no tenés objetivos de ahorro.</p>}

      {data && data.length > 0 && (
        <ul className="list-none p-0 m-0 flex flex-col gap-3">
          {data.map((goal) => {
            const completed = goal.currentAmount >= goal.targetAmount;
            const ratio = goal.targetAmount > 0 ? goal.currentAmount / goal.targetAmount : 0;
            const past = goal.deadline ? isPastDeadline(goal.deadline) : false;

            return (
              <li key={goal.id}>
                <div className="flex justify-between items-baseline gap-2">
                  <span className="text-ink">{goal.name}</span>
                  {completed ? (
                    <span className="text-income text-sm">Completado</span>
                  ) : (
                    goal.deadline && (
                      <span className={`text-sm ${past ? 'text-expense' : 'text-body'}`}>
                        {formatDeadline(goal.deadline)}
                      </span>
                    )
                  )}
                </div>
                <ProgressBar
                  ratio={ratio}
                  tone={completed ? 'income' : 'brand'}
                  label={'Objetivo ' + goal.name}
                />
                <p className="text-body text-sm tabular-nums">
                  {formatMoney(goal.currentAmount, goal.currency)} de{' '}
                  {formatMoney(goal.targetAmount, goal.currency)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
