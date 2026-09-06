import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/toastContext';
import { GroupBalanceLine } from './GroupBalanceLine';
import { groupErrorMessage } from './errorMessages';
import { useCreateGroup, useGroups } from './useGroups';

export function GroupsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');

  const toast = useToast();
  const { data: groups, isPending, isError } = useGroups();
  const createMutation = useCreateGroup();

  const closeForm = () => {
    setFormOpen(false);
    setName('');
  };

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    createMutation.mutate(
      { name: trimmed },
      {
        onSuccess: () => {
          toast.success('Grupo creado.');
          closeForm();
        },
        onError: (error) => toast.error(groupErrorMessage(error)),
      },
    );
  };

  return (
    <section className="flex flex-col gap-4 text-left">
      <PageHeader
        title="Grupos"
        description="Gastos compartidos con la gente con la que vivís, viajás o salís."
        actions={
          <Button type="button" onClick={() => setFormOpen(true)}>
            Nuevo grupo
          </Button>
        }
      />

      {isPending && <Skeleton variant="list" rows={3} />}

      {isError && (
        <p role="alert" className="text-expense">
          No pudimos cargar tus grupos. Intentá de nuevo.
        </p>
      )}

      {groups && groups.length === 0 && (
        <EmptyState
          title="Todavía no tenés grupos."
          message="Un grupo sirve para repartir gastos entre varios y que a cada uno le quede anotado lo suyo."
          actionLabel="Crear el primero"
          onAction={() => setFormOpen(true)}
        />
      )}

      {groups && groups.length > 0 && (
        <ul className="grid gap-3 lg:grid-cols-2">
          {groups.map((group) => (
            <li key={group.id}>
              <Link to={`/grupos/${group.id}`} className="block no-underline">
                <Card interactive>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <h2 className="text-base font-semibold text-ink">{group.name}</h2>
                      <span className="text-sm text-muted">
                        {group.memberCount === 1 ? '1 persona' : `${group.memberCount} personas`}
                      </span>
                    </div>
                    <GroupBalanceLine balance={group.myBalance} />
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Modal open={formOpen} onClose={closeForm} title="Nuevo grupo">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Input
            label="Nombre"
            value={name}
            autoFocus
            maxLength={100}
            helper="Por ejemplo: Depto, Viaje a Bariloche, Asado de los viernes."
            onChange={(e) => setName(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeForm}>
              Cancelar
            </Button>
            <Button type="submit" loading={createMutation.isPending} disabled={!name.trim()}>
              Crear grupo
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
