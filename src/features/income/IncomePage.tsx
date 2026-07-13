import { IncomeEntryForm } from './IncomeEntryForm';
import { IncomeSourceList } from './IncomeSourceList';
import { IncomeEntryList } from './IncomeEntryList';

export function IncomePage() {
  return (
    <section className="text-left flex flex-col gap-4">
      <h1>Ingresos</h1>
      <IncomeEntryForm />
      <IncomeSourceList />
      <IncomeEntryList />
    </section>
  );
}
