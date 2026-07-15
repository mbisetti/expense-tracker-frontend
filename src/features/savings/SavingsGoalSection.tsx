import { Card } from '../../components/ui/Card';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatMoney } from '../../lib/money';
import { useSavingsGoals } from './useSavingsGoals';

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
    <Card>
      <h2>Objetivos de ahorro</h2>

      {isPending && <Skeleton variant="list" rows={3} />}

      {isError && (
        <p role="alert" className="text-expense">
          No pudimos cargar los objetivos de ahorro. Intentá de nuevo.
        </p>
      )}

      {data && data.length === 0 && (
        <EmptyState
          title="Todavía no tenés objetivos de ahorro."
          message="Creá un objetivo para ahorrar hacia una meta y seguí el progreso acá."
        />
      )}

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
                    <span className="text-income text-sm shrink-0 whitespace-nowrap">Completado</span>
                  ) : (
                    goal.deadline && (
                      <span className={`text-sm shrink-0 whitespace-nowrap ${past ? 'text-expense' : 'text-body'}`}>
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
    </Card>
  );
}
