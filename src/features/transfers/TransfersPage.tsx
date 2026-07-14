import { TransferForm } from './TransferForm';
import { TransferList } from './TransferList';

export function TransfersPage() {
  return (
    <section className="text-left flex flex-col gap-4">
      <h1>Transferencias</h1>
      <TransferForm />
      <TransferList />
    </section>
  );
}
