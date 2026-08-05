import { lazy, Suspense } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatMoney } from '../../lib/money';
import { formatDate, useDateFormat } from '../../lib/dateFormat';
import { useAccountPerformance } from './useAccountPerformance';
import type { Account, CurrencyPerformance } from './api';

// Recharts lazy (patrón MonthlyChart): no engordar el bundle inicial por un modal que la mayoría
// de las sesiones no abre.
const PerformanceChart = lazy(() =>
  import('./PerformanceChart').then((m) => ({ default: m.PerformanceChart })),
);

type PerformanceDetailModalProps = {
  account: Account;
  onClose: () => void;
};

// S40 (D3): el detalle del rendimiento.
//
// Pedido textual de Marko: "que se vea cuánta plata se puso, inicial y todos los meses". De ahí
// salen los cuatro totales de arriba (puesta inicial con fecha, aportado, retirado, rendimiento
// histórico) y el gráfico de 12 meses. El % de cada mes vive en el tooltip del gráfico, nunca
// suelto: un mes malo desinforma y deprime.
export function PerformanceDetailModal({ account, onClose }: PerformanceDetailModalProps) {
  const { data, isPending, isError } = useAccountPerformance(account.id);

  return (
    <Modal open onClose={onClose} title={`Rendimiento de ${account.name}`}>
      {isPending ? (
        <Skeleton variant="list" rows={4} />
      ) : isError ? (
        <p className="text-sm text-expense">No pudimos calcular el rendimiento.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {data?.currencies.map((c) => (
            <CurrencyBlock key={c.currency} performance={c} />
          ))}
        </div>
      )}
    </Modal>
  );
}

function CurrencyBlock({ performance: p }: { performance: CurrencyPerformance }) {
  const { pref: dateFmt } = useDateFormat();
  const hasHistory = p.series.some(
    (m) => m.contributions !== 0 || m.withdrawals !== 0 || m.yield !== 0,
  );

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-ink">{p.currency}</h3>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <Row
          label="Puesta inicial"
          value={
            p.initialContribution
              ? `${formatMoney(p.initialContribution.amount, p.currency)} · ${formatDate(
                  p.initialContribution.date,
                  dateFmt,
                )}`
              : '—'
          }
        />
        <Row label="Aportado en total" value={formatMoney(p.totalContributed, p.currency)} />
        <Row label="Retirado" value={formatMoney(p.totalWithdrawn, p.currency)} />
        {/* Histórico COMPLETO, no la ventana: es "cuánto gané desde siempre". */}
        <Row
          label="Rendimiento acumulado"
          value={formatMoney(p.totalYield, p.currency)}
          tone={p.totalYield >= 0 ? 'income' : 'expense'}
        />
        <Row label="Saldo hoy" value={formatMoney(p.currentBalance, p.currency)} />
      </dl>

      {hasHistory ? (
        <Suspense fallback={<Skeleton variant="list" rows={3} />}>
          <PerformanceChart series={p.series} currency={p.currency} />
        </Suspense>
      ) : (
        <p className="text-sm text-muted">Todavía no hay movimientos en {p.currency}.</p>
      )}

      {p.projection ? (
        <p className="text-sm text-body">
          Si sigue como venía: ≈{' '}
          <span className="font-semibold tabular-nums text-ink">
            {formatMoney(p.projection.projectedBalance, p.currency)}
          </span>{' '}
          dentro de un año.{' '}
          <span className="text-muted">
            Estimación sobre {p.projection.monthsWithBase} meses ({p.projection.monthlyRatePct}%
            mensual promedio).
          </span>
        </p>
      ) : (
        // Con menos de 3 meses con base no se proyecta: sobre dos puntos es inventar (D3).
        <p className="text-xs text-muted">
          Todavía no hay historia suficiente para estimar cómo sigue.
        </p>
      )}
    </section>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'income' | 'expense';
}) {
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd
        className={`m-0 text-right font-semibold tabular-nums ${
          tone === 'income' ? 'text-income' : tone === 'expense' ? 'text-expense' : 'text-ink'
        }`}
      >
        {value}
      </dd>
    </>
  );
}
