import { Select } from '../../components/ui/Select';
import { useAccounts } from '../accounts/useAccounts';
import { usePaymentMethods } from '../paymentMethods/usePaymentMethods';
import { useCategories } from '../categories/useCategories';

// Las cuentas de PASIVO no sirven acá, por lo mismo que en el cobro de "Hoy por vos, mañana por
// mí": la plata compartida sale de una cuenta de activo. El backend rechaza con
// NOT_AN_ASSET_ACCOUNT; acá directamente no se ofrecen.
const LIABILITY_TYPES = ['CREDIT', 'DEBT'];

type MembershipFieldsProps = {
  accountId: string;
  paymentMethodId: string;
  categoryId: string;
  onAccountChange: (value: string) => void;
  onPaymentMethodChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  disabled?: boolean;
};

// Con qué plata entrás a un grupo. Vive en un componente propio porque lo usan los dos caminos
// que lo escriben: la pantalla de entrada y el cambio posterior desde el grupo.
//
// La cuenta es lo único obligatorio. Sin ella el grupo no tiene dónde anotarte, y en vez de
// trabar a todos, tus filas quedan sin generar hasta que la elijas.
export function MembershipFields({
  accountId,
  paymentMethodId,
  categoryId,
  onAccountChange,
  onPaymentMethodChange,
  onCategoryChange,
  disabled,
}: MembershipFieldsProps) {
  const { data: accounts } = useAccounts();
  const { data: paymentMethods } = usePaymentMethods(accountId || undefined);
  const { data: categories } = useCategories();

  const assetAccounts = (accounts ?? []).filter((a) => !LIABILITY_TYPES.includes(a.type));
  const expenseCategories = (categories ?? []).filter((c) => c.type !== 'INCOME');

  return (
    <div className="flex flex-col gap-3">
      <Select
        label="Cuenta"
        id="group-account"
        value={accountId}
        disabled={disabled}
        helper="De acá sale tu parte de los gastos del grupo."
        onChange={(e) => {
          onAccountChange(e.target.value);
          // El método de pago cuelga de la cuenta: si cambia la cuenta, el que estaba elegido
          // puede no pertenecerle.
          onPaymentMethodChange('');
        }}
      >
        <option value="">Elegí una cuenta</option>
        {assetAccounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name}
          </option>
        ))}
      </Select>

      <Select
        label="Método de pago (opcional)"
        id="group-payment-method"
        value={paymentMethodId}
        disabled={disabled || !accountId}
        onChange={(e) => onPaymentMethodChange(e.target.value)}
      >
        <option value="">Sin método de pago</option>
        {(paymentMethods ?? []).map((pm) => (
          <option key={pm.id} value={pm.id}>
            {pm.name}
          </option>
        ))}
      </Select>

      <Select
        label="Categoría (opcional)"
        id="group-category"
        value={categoryId}
        disabled={disabled}
        helper="Con la que se van a anotar tus gastos de este grupo."
        onChange={(e) => onCategoryChange(e.target.value)}
      >
        <option value="">La que sugiera cada gasto</option>
        {expenseCategories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
