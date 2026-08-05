import { Link } from 'react-router-dom';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatMoney } from '../../lib/money';
import { usePersonDebts } from '../shared/useShared';

// S40 (D4/D7): el pie de la card de "Deudas con amigos".
//
// Esta cuenta NO ofrece las acciones genéricas de una DEBT ([Registrar pago] / [Ajustar deuda]).
// Un pago genérico bajaría el saldo sin cerrar ninguna deuda concreta, y el desglose por persona
// quedaría diciendo que le seguís debiendo a todo el mundo. Saldar pasa siempre por Debés, que
// mueve las dos cosas juntas.
//
// Lo que sí muestra es de quién es cada peso: sin esto la card es un número rojo sin explicación.
export function FriendDebtsBreakdown() {
  const { data, isPending } = usePersonDebts();

  return (
    <div className="flex flex-col gap-2 border-t border-line pt-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          A quién le debés
        </span>
        <Link
          to="/expenses#compartidos"
          className="text-sm text-brand underline-offset-2 hover:underline"
        >
          Ver en Gastos
        </Link>
      </div>

      {isPending ? (
        <Skeleton variant="list" rows={2} />
      ) : !data?.people?.length ? (
        // Saldo en 0 y nadie en la lista: la cuenta quedó vacía y es correcto que se vea así.
        // Si además no tiene historial, borrarla es válido — vuelve a nacer con la próxima deuda.
        <p className="text-sm text-muted">No le debés nada a nadie.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
          {data.people.map((person) => (
            <li key={person.personId} className="flex items-center justify-between gap-3 py-1.5">
              <span className="min-w-0 truncate text-sm text-ink">{person.name}</span>
              <span className="flex shrink-0 items-baseline gap-2">
                {person.owed.map((o) => (
                  <span key={o.currency} className="text-sm font-semibold tabular-nums text-ink">
                    {formatMoney(o.amount, o.currency)}
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
