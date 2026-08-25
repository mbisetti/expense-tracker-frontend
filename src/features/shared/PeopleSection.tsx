import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { DeleteButton, EditButton } from '../../components/ui/ActionsMenu';
import { useToast } from '../../components/ui/toastContext';
import { usePeople, useCreatePerson, useUpdatePerson, useDeletePerson } from './useShared';
import { sharedErrorMessage } from './errorMessages';
import type { Person } from './api';

// Gestión de las personas de "Hoy por vos, mañana por mí", en /datos junto a Categorías y
// Métodos de pago (mismo estatus: son etiquetas del usuario). El alta rápida también vive en el
// form del gasto; acá está para renombrar y limpiar, que es lo que la otra vía no puede hacer.
export function PeopleSection() {
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<Person | null>(null);
  const [editName, setEditName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<Person | null>(null);

  const toast = useToast();
  const { data: people, isPending } = usePeople();
  const createPerson = useCreatePerson();
  const updatePerson = useUpdatePerson();
  const deletePerson = useDeletePerson();

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    createPerson.mutate(name, {
      onSuccess: () => {
        setNewName('');
        toast.success('Persona agregada.');
      },
      onError: (error) => toast.error(sharedErrorMessage(error)),
    });
  };

  const startEdit = (person: Person) => {
    setEditing(person);
    setEditName(person.name);
  };

  const handleUpdate = () => {
    if (!editing) return;
    const name = editName.trim();
    if (!name || name === editing.name) {
      setEditing(null);
      return;
    }
    updatePerson.mutate(
      { id: editing.id, name },
      {
        onSuccess: () => {
          setEditing(null);
          toast.success('Nombre actualizado.');
        },
        onError: (error) => toast.error(sharedErrorMessage(error)),
      },
    );
  };

  const handleDelete = () => {
    if (!confirmDelete) return;
    deletePerson.mutate(confirmDelete.id, {
      onSuccess: () => toast.success('Persona borrada.'),
      // El 409 de "todavía te debe" llega acá con su copy — no es un error genérico.
      onError: (error) => toast.error(sharedErrorMessage(error)),
      onSettled: () => setConfirmDelete(null),
    });
  };

  return (
    <>
      <Card>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold text-ink">Personas</h2>
            <span className="text-sm text-muted">
              Con quiénes compartís gastos en «Hoy por vos, mañana por mí».
            </span>
          </div>

          {!isPending && people?.length === 0 && (
            <p className="text-sm text-muted">
              Todavía no agregaste a nadie. También podés crearlos al cargar un gasto compartido.
            </p>
          )}

          {people && people.length > 0 && (
            <ul className="flex flex-col divide-y divide-line">
              {people.map((person) => (
                <li key={person.id} className="flex min-h-11 items-center justify-between gap-3 py-1">
                  {editing?.id === person.id ? (
                    <div className="flex flex-1 items-end gap-2">
                      <div className="flex-1">
                        <Input
                          label="Nombre"
                          id={`person-name-${person.id}`}
                          type="text"
                          maxLength={100}
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          disabled={updatePerson.isPending}
                        />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleUpdate}
                        loading={updatePerson.isPending}
                      >
                        Guardar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditing(null)}
                        disabled={updatePerson.isPending}
                      >
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="text-ink">{person.name}</span>
                      {/* Dos íconos parejos (lápiz + tacho): el "Borrar" con texto en cada una
                          de las 14 filas pesaba más que los nombres que administra. */}
                      <div className="flex items-center gap-1">
                        <EditButton onClick={() => startEdit(person)} label={person.name} />
                        <DeleteButton onClick={() => setConfirmDelete(person)} label={person.name} />
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                label="Nueva persona"
                id="new-person"
                type="text"
                maxLength={100}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Juan"
                disabled={createPerson.isPending}
              />
            </div>
            <Button type="button" onClick={handleCreate} loading={createPerson.isPending}>
              Agregar
            </Button>
          </div>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmDelete !== null}
        danger
        title="Borrar persona"
        message={`Se borra "${confirmDelete?.name ?? ''}". Si todavía te debe plata de algún gasto, primero registrá el cobro.`}
        confirmLabel="Borrar"
        loading={deletePerson.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  );
}
