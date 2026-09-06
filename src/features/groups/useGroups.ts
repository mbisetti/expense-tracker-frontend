import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useHttp } from '../../lib/useHttp';
import type { ApiError } from '../../lib/http';
import type {
  CreateGroupInput,
  GroupDetail,
  GroupInvite,
  GroupMember,
  GroupSummary,
  JoinGroupInput,
  JoinPreview,
  MembershipInput,
  UpdateGroupInput,
} from './api';

const GROUPS_KEY = ['groups'];

// El saldo de un grupo se deriva de sus gastos, así que todo lo que toque un grupo invalida su
// detalle Y la lista (donde vive el saldo de la card).
//
// Nada de acá invalida ['transactions'] ni ['accounts'] a propósito: en el Bloque A el grupo
// todavía no escribe una sola fila del ledger. Cuando entre el gasto de grupo, ESE hook sí las
// necesita y va a la lista de MONEY_MOVING_HOOKS de lib/cacheContract.test.ts.
function useInvalidateGroup() {
  const queryClient = useQueryClient();
  return (groupId?: string) => {
    queryClient.invalidateQueries({ queryKey: GROUPS_KEY });
    if (groupId) {
      queryClient.invalidateQueries({ queryKey: ['groups', groupId] });
    }
  };
}

export function useGroups() {
  const http = useHttp();
  return useQuery({
    queryKey: GROUPS_KEY,
    queryFn: () => http<GroupSummary[]>('/groups'),
  });
}

export function useGroup(groupId: string | undefined) {
  const http = useHttp();
  return useQuery({
    queryKey: ['groups', groupId],
    queryFn: () => http<GroupDetail>(`/groups/${groupId}`),
    enabled: Boolean(groupId),
  });
}

export function useCreateGroup() {
  const http = useHttp();
  const invalidate = useInvalidateGroup();

  return useMutation<GroupDetail, ApiError, CreateGroupInput>({
    mutationFn: (input) =>
      http<GroupDetail>('/groups', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateGroup() {
  const http = useHttp();
  const invalidate = useInvalidateGroup();

  return useMutation<GroupDetail, ApiError, { groupId: string; input: UpdateGroupInput }>({
    mutationFn: ({ groupId, input }) =>
      http<GroupDetail>(`/groups/${groupId}`, { method: 'PATCH', body: JSON.stringify(input) }),
    onSuccess: (_data, { groupId }) => invalidate(groupId),
  });
}

// El backend responde 409 si queda algún saldo abierto: el grupo se borra en cero o no se borra.
export function useDeleteGroup() {
  const http = useHttp();
  const invalidate = useInvalidateGroup();

  return useMutation<void, ApiError, string>({
    mutationFn: (groupId) => http<void>(`/groups/${groupId}`, { method: 'DELETE' }),
    onSuccess: () => invalidate(),
  });
}

// Anotar a alguien que todavía no tiene la app. Lo puede hacer cualquier miembro: el que carga la
// cena es el que sabe quién estaba.
export function useAddGroupMember() {
  const http = useHttp();
  const invalidate = useInvalidateGroup();

  return useMutation<GroupMember, ApiError, { groupId: string; displayName: string }>({
    mutationFn: ({ groupId, displayName }) =>
      http<GroupMember>(`/groups/${groupId}/members`, {
        method: 'POST',
        body: JSON.stringify({ displayName }),
      }),
    onSuccess: (_data, { groupId }) => invalidate(groupId),
  });
}

// Mi cuenta en este grupo, y sólo la mía.
export function useUpdateMyMembership() {
  const http = useHttp();
  const invalidate = useInvalidateGroup();

  return useMutation<void, ApiError, { groupId: string; input: MembershipInput }>({
    mutationFn: ({ groupId, input }) =>
      http<void>(`/groups/${groupId}/members/me`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: (_data, { groupId }) => invalidate(groupId),
  });
}

// Salir (si el memberId es el mío) o sacar a alguien (si soy quien creó el grupo). Las dos exigen
// saldo cero, y el backend responde 409 con MEMBER_HAS_OPEN_BALANCE si no.
export function useRemoveGroupMember() {
  const http = useHttp();
  const invalidate = useInvalidateGroup();

  return useMutation<void, ApiError, { groupId: string; memberId: string }>({
    mutationFn: ({ groupId, memberId }) =>
      http<void>(`/groups/${groupId}/members/${memberId}`, { method: 'DELETE' }),
    onSuccess: (_data, { groupId }) => invalidate(groupId),
  });
}

// Genera el link, o lo rota si ya había uno. Rotar mata el anterior en el acto, que es la única
// forma de sacar de circulación un link que se compartió de más.
export function useGroupInvite() {
  const http = useHttp();

  return useMutation<GroupInvite, ApiError, string>({
    mutationFn: (groupId) => http<GroupInvite>(`/groups/${groupId}/invite`, { method: 'POST' }),
  });
}

export function useRevokeGroupInvite() {
  const http = useHttp();

  return useMutation<void, ApiError, string>({
    mutationFn: (groupId) => http<void>(`/groups/${groupId}/invite`, { method: 'DELETE' }),
  });
}

// Lo que se ve ANTES de entrar. No exige ser miembro (es la única lectura de un grupo que no lo
// exige) y por eso trae nombres y cantidades, ninguna plata.
//
// retry en false: un token inválido da 400 y reintentarlo tres veces sólo hace esperar al usuario
// para mostrarle el mismo error.
export function useJoinPreview(token: string | undefined) {
  const http = useHttp();
  return useQuery({
    queryKey: ['group-join', token],
    queryFn: () => http<JoinPreview>(`/groups/join/${token}`),
    enabled: Boolean(token),
    retry: false,
  });
}

export function useJoinGroup() {
  const http = useHttp();
  const invalidate = useInvalidateGroup();

  return useMutation<{ groupId: string }, ApiError, JoinGroupInput>({
    mutationFn: (input) =>
      http<{ groupId: string }>('/groups/join', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidate(),
  });
}
