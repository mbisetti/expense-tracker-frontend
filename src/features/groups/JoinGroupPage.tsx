import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/toastContext';
import { MembershipFields } from './MembershipFields';
import { groupErrorMessage } from './errorMessages';
import { useJoinGroup, useJoinPreview } from './useGroups';

const NUEVO = '__nuevo__';

// La pantalla de entrada al grupo.
//
// Es una sola pantalla y hace cuatro cosas en orden: te muestra a qué grupo estás entrando, te
// pregunta si alguno de los nombres que ya están anotados sos vos, te pide de qué cuenta sale tu
// plata, y recién ahí te deja entrar diciéndote qué va a pasar.
//
// El paso 4 no es adorno: entrar a un grupo es aceptar que los gastos que cargue otra persona se
// anoten solos en TU cuenta. La convención de la casa es que todo flujo que toque plata se
// pre-confirma, y éste toca plata de la manera más fuerte que hay en la app.
export function JoinGroupPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? undefined;
  const navigate = useNavigate();
  const toast = useToast();

  const { data: preview, isPending, isError, error } = useJoinPreview(token);
  const joinMutation = useJoinGroup();

  const [claim, setClaim] = useState(NUEVO);
  const [accountId, setAccountId] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [categoryId, setCategoryId] = useState('');

  if (!token) {
    return (
      <section className="flex flex-col gap-4 text-left">
        <PageHeader title="Entrar a un grupo" />
        <p role="alert" className="text-expense">
          Este link está incompleto. Pedile uno nuevo a quien te invitó.
        </p>
      </section>
    );
  }

  if (isPending) {
    return <Skeleton variant="card" />;
  }

  if (isError || !preview) {
    return (
      <section className="flex flex-col gap-4 text-left">
        <PageHeader title="Entrar a un grupo" />
        <p role="alert" className="text-expense">
          {groupErrorMessage(error)}
        </p>
      </section>
    );
  }

  const join = () => {
    if (!accountId) return;
    joinMutation.mutate(
      {
        token,
        claimMemberId: claim === NUEVO ? null : claim,
        accountId,
        paymentMethodId: paymentMethodId || null,
        categoryId: categoryId || null,
      },
      {
        onSuccess: ({ groupId }) => {
          toast.success(`Ya estás en ${preview.groupName}.`);
          navigate(`/grupos/${groupId}`);
        },
        onError: (error) => toast.error(groupErrorMessage(error)),
      },
    );
  };

  return (
    <section className="flex flex-col gap-4 text-left">
      <PageHeader
        title={`Entrar a ${preview.groupName}`}
        description={
          preview.memberCount === 1
            ? 'Hay 1 persona en el grupo.'
            : `Hay ${preview.memberCount} personas en el grupo.`
        }
      />

      {preview.alreadyMember && (
        <Card>
          <div className="flex flex-col gap-3">
            <p className="text-ink">Ya estás en este grupo.</p>
            <div>
              <Button type="button" onClick={() => navigate('/grupos')}>
                Ir a mis grupos
              </Button>
            </div>
          </div>
        </Card>
      )}

      {!preview.alreadyMember && (
        <>
          {preview.claimable.length > 0 && (
            <Card header={<h2 className="text-base font-semibold text-ink">¿Alguno de estos sos vos?</h2>}>
              <fieldset className="flex flex-col gap-2">
                <legend className="sr-only">Elegí tu lugar en el grupo</legend>
                <p className="text-sm text-muted">
                  Si ya te venían anotando gastos con alguno de estos nombres, elegilo y esas cuentas
                  pasan a ser tuyas.
                </p>
                {preview.claimable.map((member) => (
                  <label key={member.id} className="flex items-center gap-2 text-ink">
                    <input
                      type="radio"
                      name="claim"
                      value={member.id}
                      checked={claim === member.id}
                      onChange={() => setClaim(member.id)}
                    />
                    {member.displayName}
                  </label>
                ))}
                <label className="flex items-center gap-2 text-ink">
                  <input
                    type="radio"
                    name="claim"
                    value={NUEVO}
                    checked={claim === NUEVO}
                    onChange={() => setClaim(NUEVO)}
                  />
                  Ninguno, entro como alguien nuevo
                </label>
              </fieldset>
            </Card>
          )}

          <Card header={<h2 className="text-base font-semibold text-ink">¿De dónde sale tu plata?</h2>}>
            <MembershipFields
              accountId={accountId}
              paymentMethodId={paymentMethodId}
              categoryId={categoryId}
              onAccountChange={setAccountId}
              onPaymentMethodChange={setPaymentMethodId}
              onCategoryChange={setCategoryId}
            />
          </Card>

          <Card header={<h2 className="text-base font-semibold text-ink">Antes de entrar</h2>}>
            <div className="flex flex-col gap-3">
              <ul className="flex flex-col gap-2 text-sm text-body">
                <li>Los gastos que cargue cualquiera del grupo se van a anotar solos en tu cuenta.</li>
                <li>Te avisamos cada vez, y lo que te toca cuenta en tu mes y en tus presupuestos.</li>
                <li>El grupo ve tu nombre y los montos de los gastos.</li>
                <li>Tu cuenta, tu categoría y tu saldo no los ve nadie más.</li>
              </ul>
              <div>
                <Button
                  type="button"
                  loading={joinMutation.isPending}
                  disabled={!accountId}
                  onClick={join}
                >
                  Entrar al grupo
                </Button>
              </div>
            </div>
          </Card>
        </>
      )}
    </section>
  );
}
