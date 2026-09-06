import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useToast } from '../../components/ui/toastContext';
import { MembershipFields } from './MembershipFields';
import { groupErrorMessage } from './errorMessages';
import { useUpdateMyMembership } from './useGroups';

type MyMembershipCardProps = {
  groupId: string;
  savedAccountId: string | null;
  savedPaymentMethodId: string | null;
  savedCategoryId: string | null;
};

// "Tu cuenta en este grupo" vive en su propio componente por una razón concreta: **el estado se
// inicializa en el mount y no se sincroniza con un useEffect**.
//
// La versión con efecto copiaba los valores guardados a los campos cada vez que cambiaban, y eso
// es exactamente el `setState` dentro de un efecto que la regla `react-hooks/set-state-in-effect`
// desaconseja: renders en cascada, y el riesgo real de pisarte lo que estás tipeando si la query
// se refresca mientras editás.
//
// El caller lo monta con `key` armada desde los valores guardados: mientras no cambien, el
// componente no se remonta y tus ediciones quedan intactas; cuando cambian (guardaste), se
// remonta con los valores nuevos. Es el mismo idioma que ya usa el proyecto en `PaymentMethodForm`
// (`key={editing?.id ?? 'new'}`) y el que documenta `CurrencySelect`.
export function MyMembershipCard({
  groupId,
  savedAccountId,
  savedPaymentMethodId,
  savedCategoryId,
}: MyMembershipCardProps) {
  const toast = useToast();
  const updateMembership = useUpdateMyMembership();

  const [accountId, setAccountId] = useState(savedAccountId ?? '');
  const [paymentMethodId, setPaymentMethodId] = useState(savedPaymentMethodId ?? '');
  const [categoryId, setCategoryId] = useState(savedCategoryId ?? '');

  const save = () => {
    if (!accountId) return;
    updateMembership.mutate(
      {
        groupId,
        input: {
          accountId,
          paymentMethodId: paymentMethodId || null,
          categoryId: categoryId || null,
        },
      },
      {
        onSuccess: () => toast.success('Listo, ya sabemos de dónde sale tu parte.'),
        onError: (error) => toast.error(groupErrorMessage(error)),
      },
    );
  };

  return (
    <Card header={<h2 className="text-base font-semibold text-ink">Tu cuenta en este grupo</h2>}>
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted">
          De acá sale tu parte de cada gasto del grupo, y con esta categoría se anota en tus
          informes. Nadie más ve esto.
        </p>
        <MembershipFields
          accountId={accountId}
          paymentMethodId={paymentMethodId}
          categoryId={categoryId}
          onAccountChange={setAccountId}
          onPaymentMethodChange={setPaymentMethodId}
          onCategoryChange={setCategoryId}
        />
        <div>
          <Button type="button" loading={updateMembership.isPending} disabled={!accountId} onClick={save}>
            Guardar
          </Button>
        </div>
      </div>
    </Card>
  );
}
