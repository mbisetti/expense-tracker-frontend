import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/toastContext';
import { GroupBalancesSection } from './GroupBalancesSection';
import { GroupExpenseModal } from './GroupExpenseModal';
import { GroupExpensesSection } from './GroupExpensesSection';
import { GroupRecurringSection } from './GroupRecurringSection';
import type { GroupExpense } from './api';
import { MyMembershipCard } from './MyMembershipCard';
import { groupErrorMessage } from './errorMessages';
import {
  useAddGroupMember,
  useDeleteGroup,
  useGroup,
  useGroupInvite,
  useRemoveGroupMember,
} from './useGroups';

export function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const { data: group, isPending, isError } = useGroup(id);

  const [newMemberName, setNewMemberName] = useState('');
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<GroupExpense | null>(null);

  const addMember = useAddGroupMember();
  const removeMember = useRemoveGroupMember();
  const invite = useGroupInvite();
  const deleteGroup = useDeleteGroup();

  if (isPending) {
    return <Skeleton variant="list" rows={4} />;
  }

  if (isError || !group) {
    return (
      <p role="alert" className="text-expense">
        No encontramos ese grupo.
      </p>
    );
  }

  const liveMembers = group.members.filter((member) => !member.left);

  const addPlaceholder = () => {
    const trimmed = newMemberName.trim();
    if (!trimmed) return;

    addMember.mutate(
      { groupId: group.id, displayName: trimmed },
      {
        onSuccess: () => {
          setNewMemberName('');
          toast.success(`${trimmed} quedó anotado en el grupo.`);
        },
        onError: (error) => toast.error(groupErrorMessage(error)),
      },
    );
  };

  const generateInvite = () => {
    invite.mutate(group.id, {
      onSuccess: async (data) => {
        setInviteUrl(data.url);
        try {
          await navigator.clipboard.writeText(data.url);
          toast.success('Link copiado. Mandáselo a quien quieras sumar.');
        } catch {
          // Sin permiso de portapapeles el link igual queda a la vista para copiarlo a mano.
          toast.success('Link listo. Copialo de acá abajo.');
        }
      },
      onError: (error) => toast.error(groupErrorMessage(error)),
    });
  };

  const leave = () => {
    removeMember.mutate(
      { groupId: group.id, memberId: group.myMemberId },
      {
        onSuccess: () => {
          toast.success('Saliste del grupo.');
          navigate('/grupos');
        },
        onError: (error) => toast.error(groupErrorMessage(error)),
        onSettled: () => setConfirmLeave(false),
      },
    );
  };

  const removeSomeone = (memberId: string, displayName: string) => {
    removeMember.mutate(
      { groupId: group.id, memberId },
      {
        onSuccess: () => toast.success(`${displayName} ya no está en el grupo.`),
        onError: (error) => toast.error(groupErrorMessage(error)),
      },
    );
  };

  const destroy = () => {
    deleteGroup.mutate(group.id, {
      onSuccess: () => {
        toast.success('Grupo borrado.');
        navigate('/grupos');
      },
      onError: (error) => toast.error(groupErrorMessage(error)),
      onSettled: () => setConfirmDelete(false),
    });
  };

  return (
    <section className="flex flex-col gap-4 text-left">
      <PageHeader
        title={group.name}
        backTo={{ to: '/grupos', label: 'Grupos' }}
        actions={
          <Button type="button" onClick={() => setExpenseOpen(true)}>
            Nuevo gasto
          </Button>
        }
      />

      {/* Antes acá había una card "Tu saldo" con sólo lo mío. La reemplaza esta, que dice quién
          le debe a quién e incluye mis filas: dos cards hablando de saldos era repetir. Mi neto
          por grupo sigue estando en la lista de /grupos, que es donde se mira de un vistazo. */}
      <GroupBalancesSection groupId={group.id} />

      <GroupExpensesSection
        groupId={group.id}
        onAdd={() => setExpenseOpen(true)}
        onEdit={setEditingExpense}
      />

      <GroupRecurringSection
        groupId={group.id}
        currency={group.currency}
        members={liveMembers}
        myMemberId={group.myMemberId}
      />

      <Card header={<h2 className="text-base font-semibold text-ink">Quiénes están</h2>}>
        <div className="flex flex-col gap-4">
          <ul className="flex flex-col gap-2">
            {liveMembers.map((member) => (
              <li key={member.id} className="flex flex-wrap items-center gap-2">
                <span className="text-ink">{member.displayName}</span>
                {member.me && <Badge status="info" label="Vos" />}
                {member.owner && <Badge status="info" label="Creó el grupo" />}
                {/* pending y no warning: que alguien todavía no tenga la app no es un problema,
                    se le reparte igual. Es un estado de espera, y el reloj lo dice mejor. */}
                {!member.claimed && <Badge status="pending" label="Todavía sin la app" />}
                {group.owner && !member.me && (
                  <button
                    type="button"
                    className="ml-auto text-sm text-muted underline transition-colors duration-200 ease-out hover:text-expense"
                    onClick={() => removeSomeone(member.id, member.displayName)}
                  >
                    Sacar del grupo
                  </button>
                )}
              </li>
            ))}
          </ul>

          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              addPlaceholder();
            }}
          >
            <div className="min-w-52 flex-1">
              <Input
                label="Sumar a alguien que todavía no tiene la app"
                value={newMemberName}
                maxLength={100}
                helper="Se le reparte igual. Cuando se registre, va a poder quedarse con este lugar."
                onChange={(e) => setNewMemberName(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              variant="secondary"
              loading={addMember.isPending}
              disabled={!newMemberName.trim()}
            >
              Sumar
            </Button>
          </form>
        </div>
      </Card>

      {group.owner && (
        <Card header={<h2 className="text-base font-semibold text-ink">Invitar</h2>}>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted">
              El link sirve para varias personas y vence a los 30 días. Si generás uno nuevo, el
              anterior deja de funcionar.
            </p>
            {inviteUrl && (
              <Input
                label="Link de invitación"
                value={inviteUrl}
                readOnly
                onFocus={(e) => e.currentTarget.select()}
              />
            )}
            <div>
              <Button type="button" variant="secondary" loading={invite.isPending} onClick={generateInvite}>
                {inviteUrl ? 'Generar uno nuevo' : 'Generar link'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* key con los valores guardados: mientras no cambien, el componente no se remonta y no te
          pisa lo que estás editando; cuando cambian (guardaste), se remonta con los nuevos. Es lo
          que evita el useEffect que sincronizaba estado, y con él los renders en cascada. */}
      <MyMembershipCard
        key={`${group.myAccountId ?? ''}-${group.myPaymentMethodId ?? ''}-${group.myCategoryId ?? ''}`}
        groupId={group.id}
        savedAccountId={group.myAccountId}
        savedPaymentMethodId={group.myPaymentMethodId}
        savedCategoryId={group.myCategoryId}
      />

      <Card>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => setConfirmLeave(true)}>
            Salir del grupo
          </Button>
          {group.owner && (
            <Button type="button" variant="danger" onClick={() => setConfirmDelete(true)}>
              Borrar grupo
            </Button>
          )}
        </div>
      </Card>

      {/* Un solo modal para alta y edición: la key lo remonta al cambiar de gasto, así el
          formulario arranca del gasto que corresponde sin un useEffect que sincronice estado.
          Mismo idioma que MyMembershipCard. */}
      <GroupExpenseModal
        key={editingExpense?.id ?? (expenseOpen ? 'nuevo' : 'cerrado')}
        open={expenseOpen || editingExpense !== null}
        onClose={() => {
          setExpenseOpen(false);
          setEditingExpense(null);
        }}
        groupId={group.id}
        currency={group.currency}
        members={liveMembers}
        myMemberId={group.myMemberId}
        expense={editingExpense}
      />

      <ConfirmDialog
        open={confirmLeave}
        title="Salir del grupo"
        message="Los gastos que ya se cargaron quedan como están, para vos y para el resto. Sólo se puede salir con las cuentas en cero."
        confirmLabel="Salir"
        loading={removeMember.isPending}
        onConfirm={leave}
        onCancel={() => setConfirmLeave(false)}
      />

      <ConfirmDialog
        open={confirmDelete}
        danger
        title="Borrar el grupo"
        message="Se borra para todos. Los gastos que ya cayeron en las cuentas de cada uno no se tocan, porque son plata que se movió de verdad."
        confirmLabel="Borrar"
        loading={deleteGroup.isPending}
        onConfirm={destroy}
        onCancel={() => setConfirmDelete(false)}
      />
    </section>
  );
}
