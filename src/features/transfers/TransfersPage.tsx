import { useSearchParams } from 'react-router-dom';
import { TransferForm } from './TransferForm';
import { TransferList } from './TransferList';

export function TransfersPage() {
  const [searchParams] = useSearchParams();
  const initialToAccountId = searchParams.get('to') ?? undefined;

  return (
    <section className="text-left flex flex-col gap-4">
      <h1>Transferencias</h1>
      {/* key: si el ?to= cambia sin desmontar la ruta, remonta el form con el destino
          nuevo (evita registrar el pago a la tarjeta equivocada por estado stale) */}
      <TransferForm key={initialToAccountId ?? 'none'} initialToAccountId={initialToAccountId} />
      <TransferList />
    </section>
  );
}
