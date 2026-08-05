import { ProgressBar } from '../../components/ui/ProgressBar';
import { formatMoney } from '../../lib/money';
import { formatDate, useDateFormat } from '../../lib/dateFormat';
import type { LoanProgress } from './api';

type LoanProgressCardProps = {
  loan: LoanProgress;
  currency: string;
};

// S40 (D5): el préstamo dentro de la card de su cuenta DEBT.
//
// Lo que se muestra es lo que un humano quiere saber de un préstamo: cuánto va pagado del total,
// por qué cuota va, cuándo vence la próxima y —si cargó el capital— cuánto le está costando.
// Nada de esto está guardado: todo se deriva de la plata que efectivamente pagó.
export function LoanProgressCard({ loan, currency }: LoanProgressCardProps) {
  const { pref: dateFmt } = useDateFormat();
  // ProgressBar clampea sola; el texto muestra la plata REAL, así que pagar de más se ve.
  const ratio = loan.totalAmount > 0 ? loan.paidAmount / loan.totalAmount : 0;

  return (
    <div className="flex flex-col gap-2 border-t border-line pt-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">Préstamo</span>
        <span className="text-sm text-body">
          {loan.completed
            ? '¡Terminado!'
            : `Cuota ${loan.paidInstallments + 1} de ${loan.installmentsTotal}`}
        </span>
      </div>

      <ProgressBar
        ratio={ratio}
        tone={loan.completed ? 'income' : 'brand'}
        label={`Progreso del préstamo: ${Math.round(ratio * 100)}%`}
      />

      <p className="text-sm text-body">
        Pagaste{' '}
        <span className="font-semibold tabular-nums text-ink">
          {formatMoney(loan.paidAmount, currency)}
        </span>{' '}
        de {formatMoney(loan.totalAmount, currency)}.
      </p>

      {!loan.completed && loan.nextDueDate && (
        <p className="text-sm text-muted">
          Próxima cuota: {formatMoney(loan.installmentAmount, currency)} el{' '}
          {formatDate(loan.nextDueDate, dateFmt)}.
        </p>
      )}

      {/* Sólo con el capital cargado: sin él, "cuánto te cuesta" no se puede saber y estimarlo
          sería inventar una tasa que nadie te dijo. */}
      {loan.cost != null && loan.costPct != null && (
        <p className="text-sm text-muted">
          Te prestaron {formatMoney(loan.principal ?? 0, currency)} y devolvés{' '}
          {formatMoney(loan.totalAmount, currency)}:{' '}
          <span className="text-ink">
            {formatMoney(loan.cost, currency)} más (+{loan.costPct}%)
          </span>
          .
        </p>
      )}
    </div>
  );
}
