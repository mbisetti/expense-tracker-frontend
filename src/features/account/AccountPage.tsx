import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/toastContext';
import { useAuth } from '../auth/useAuth';
import { useMe, useUpdateMe } from '../auth/useMe';
import { useDeleteAccount, type DeleteAccountProof } from '../auth/useDeleteAccount';
import { useResendVerification } from '../auth/useResendVerification';
import { useChangePassword } from '../auth/useChangePassword';
import { useRequestEmailChange } from '../auth/useRequestEmailChange';
import { signInWithGoogle } from '../../lib/googleAuth';
import { TelegramSection } from '../telegram/TelegramSection';
import type { ApiError } from '../../lib/http';

// S25.4 (D7) — la página "Cuenta": datos de la cuenta (nombre, email, contraseña), los
// conectores (Google, el bot de Telegram y los que vengan) y el borrado. Antes el email y el
// borrado vivían en Ajustes; Ajustes quedó solo para preferencias de la app.
export function AccountPage() {
  const { data: me } = useMe();
  const updateMe = useUpdateMe();
  const changePassword = useChangePassword();
  const requestEmailChange = useRequestEmailChange();
  const resendVerification = useResendVerification();
  const deleteAccount = useDeleteAccount();

  const { setAccessToken } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();

  // Nombre (D6): edición inline.
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  // Contraseña (D1/D2/D3).
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');

  // Email (D4).
  const [emailOpen, setEmailOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  // Borrado (S7, mudado desde Ajustes).
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  const hasPassword = me?.hasPassword !== false;

  const startEditingName = () => {
    setNameDraft(me?.name ?? '');
    setEditingName(true);
  };

  const saveName = () => {
    updateMe.mutate(
      { name: nameDraft },
      {
        onSuccess: () => {
          setEditingName(false);
          toast.success('Nombre actualizado.');
        },
        onError: () => toast.error('No se pudo actualizar el nombre.'),
      },
    );
  };

  const handleResendVerification = () => {
    resendVerification.mutate(undefined, {
      onSuccess: () => toast.success('Mail reenviado. Revisá tu casilla.'),
      onError: (error) =>
        toast.error(
          error.code === 'RATE_LIMIT_EXCEEDED'
            ? 'Demasiados intentos. Esperá un momento.'
            : 'No se pudo reenviar el mail. Intentá de nuevo.',
        ),
    });
  };

  const passwordErrorMessage = (error: ApiError): string => {
    switch (error.code) {
      case 'REAUTH_REQUIRED':
        return hasPassword
          ? 'La contraseña actual no coincide.'
          : 'No se pudo confirmar con Google.';
      case 'RATE_LIMIT_EXCEEDED':
        return 'Demasiados intentos. Esperá un momento.';
      case 'VALIDATION_ERROR':
        return 'Revisá los datos del formulario.';
      default:
        return 'Algo salió mal. Intentá de nuevo.';
    }
  };

  const closePasswordDialog = () => {
    setPasswordOpen(false);
    setCurrentPwd('');
    setNewPwd('');
    setConfirmPwd('');
  };

  const submitPassword = () => {
    if (newPwd !== confirmPwd) {
      toast.error('Las contraseñas no coinciden.');
      return;
    }
    const options = {
      onSuccess: () => {
        closePasswordDialog();
        toast.success('Contraseña guardada. Cerramos tus otras sesiones.');
      },
      onError: (error: ApiError) => toast.error(passwordErrorMessage(error)),
    };
    if (!hasPassword) {
      // Solo-Google (D1): la prueba de identidad es el visto fresco de Google, igual que en el
      // borrado de cuenta.
      void signInWithGoogle(
        (idToken) => changePassword.mutate({ idToken, newPassword: newPwd }, options),
        () => toast.error('No se pudo abrir la confirmación de Google.'),
      );
      return;
    }
    changePassword.mutate({ currentPassword: currentPwd, newPassword: newPwd }, options);
  };

  const emailErrorMessage = (error: ApiError): string => {
    switch (error.code) {
      case 'EMAIL_ALREADY_EXISTS':
        return 'Ese email ya está en uso.';
      case 'RATE_LIMIT_EXCEEDED':
        return 'Demasiados intentos. Esperá un momento.';
      case 'VALIDATION_ERROR':
        return 'Revisá el email.';
      default:
        return 'Algo salió mal. Intentá de nuevo.';
    }
  };

  const submitEmailChange = () => {
    requestEmailChange.mutate(
      { newEmail },
      {
        onSuccess: () => {
          setEmailOpen(false);
          toast.success(`Te mandamos un mail a ${newEmail} para confirmar el cambio.`);
          setNewEmail('');
        },
        onError: (error) => toast.error(emailErrorMessage(error)),
      },
    );
  };

  // S7 (mudado desde Ajustes): borrar la cuenta pide probar identidad de nuevo.
  const runDelete = (proof: DeleteAccountProof) => {
    deleteAccount.mutate(proof, {
      onSuccess: () => {
        setAccessToken(null);
        queryClient.clear();
        navigate('/login', { replace: true });
      },
      onError: (error) => {
        if (error.status === 401) {
          setDeletePassword('');
          toast.error(
            'password' in proof ? 'La contraseña no coincide.' : 'No se pudo confirmar con Google.',
          );
          return;
        }
        setConfirmingDelete(false);
        toast.error('No se pudo borrar la cuenta. Intentá de nuevo.');
      },
    });
  };

  const handleDelete = () => {
    if (me?.hasPassword === false) {
      void signInWithGoogle(
        (idToken) => runDelete({ idToken }),
        () => toast.error('No se pudo abrir la confirmación de Google.'),
      );
      return;
    }
    runDelete({ password: deletePassword });
  };

  const closeDeleteDialog = () => {
    setConfirmingDelete(false);
    setDeletePassword('');
  };

  return (
    <section className="flex flex-col gap-4 text-left">
      <PageHeader title="Cuenta" />

      <Card>
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-ink">Datos de la cuenta</h2>

          {/* Nombre (D6) */}
          {editingName ? (
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-48 flex-1">
                <Input
                  label="Nombre"
                  value={nameDraft}
                  maxLength={100}
                  onChange={(e) => setNameDraft(e.target.value)}
                  disabled={updateMe.isPending}
                />
              </div>
              <Button
                type="button"
                size="sm"
                loading={updateMe.isPending}
                disabled={nameDraft.trim() === ''}
                onClick={saveName}
              >
                Guardar
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditingName(false)}>
                Cancelar
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-sm text-ink">{me?.name}</span>
                <span className="text-sm text-muted">Nombre</span>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={startEditingName}>
                Editar
              </Button>
            </div>
          )}

          {/* Email + verificación (S25.2, mudado desde Ajustes) + cambio (D4) */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-sm text-ink">{me?.email}</span>
              <span className="text-sm text-muted">Email de la cuenta</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {me?.emailVerified ? (
                <Badge status="ok" label="Verificado" />
              ) : (
                <>
                  <Badge status="warning" label="Sin verificar" />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    loading={resendVerification.isPending}
                    onClick={handleResendVerification}
                  >
                    Reenviar mail
                  </Button>
                </>
              )}
              <Button type="button" variant="secondary" size="sm" onClick={() => setEmailOpen(true)}>
                Cambiar email
              </Button>
            </div>
          </div>

          {/* D5: sin verificar, el mail de "olvidé mi contraseña" no se manda. */}
          {me && !me.emailVerified && (
            <p className="text-sm text-warning">
              Sin verificar no podés recuperar tu contraseña si la olvidás.
            </p>
          )}

          {/* Contraseña (D1/D2) */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-sm text-ink">
                {hasPassword ? '••••••••' : 'Sin contraseña: entrás con Google'}
              </span>
              <span className="text-sm text-muted">Contraseña</span>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!me}
              onClick={() => setPasswordOpen(true)}
            >
              {hasPassword ? 'Cambiar contraseña' : 'Crear contraseña'}
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold text-ink">Conectores</h2>
            <span className="text-sm text-muted">
              Lo que está enchufado a tu cuenta. El bot de Telegram se maneja acá abajo.
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-sm text-ink">Google</span>
              <span className="text-sm text-muted">Ingresar con tu cuenta de Google</span>
            </div>
            {me?.googleLinked ? (
              <Badge status="ok" label="Conectado" />
            ) : (
              <Badge status="pending" label="No conectado" />
            )}
          </div>
        </div>
      </Card>

      {/* S30: el bot de Telegram (oculto si el backend no tiene bot configurado). */}
      <TelegramSection />

      <Card>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold text-ink">Borrar cuenta</h2>
            <span className="text-sm text-muted">
              Borrar tu cuenta elimina todos tus datos. No se puede deshacer.
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="self-start border-expense/40 text-expense hover:bg-expense/10 hover:text-expense"
            onClick={() => setConfirmingDelete(true)}
          >
            Borrar cuenta
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={passwordOpen}
        title={hasPassword ? 'Cambiar contraseña' : 'Crear contraseña'}
        message={
          hasPassword
            ? 'Confirmá con tu contraseña actual y elegí una nueva. Se van a cerrar tus otras sesiones.'
            : 'Elegí tu contraseña. Para confirmar que sos vos, te vamos a pedir el visto de Google.'
        }
        confirmLabel={hasPassword ? 'Guardar contraseña' : 'Continuar con Google'}
        loading={changePassword.isPending}
        confirmDisabled={
          newPwd.length < 8 || confirmPwd.length < 8 || (hasPassword && currentPwd === '')
        }
        onConfirm={submitPassword}
        onCancel={closePasswordDialog}
      >
        <div className="mt-3 flex flex-col gap-3">
          {hasPassword && (
            <Input
              label="Contraseña actual"
              type="password"
              autoComplete="current-password"
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
            />
          )}
          <Input
            label="Contraseña nueva"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
            helper="Mínimo 8 caracteres."
          />
          <Input
            label="Repetila"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={confirmPwd}
            onChange={(e) => setConfirmPwd(e.target.value)}
          />
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={emailOpen}
        title="Cambiar email"
        message="Te va a llegar un mail al email nuevo para confirmarlo. Hasta que lo confirmes, tu cuenta sigue con el actual."
        confirmLabel="Mandar confirmación"
        loading={requestEmailChange.isPending}
        confirmDisabled={!newEmail.includes('@')}
        onConfirm={submitEmailChange}
        onCancel={() => {
          setEmailOpen(false);
          setNewEmail('');
        }}
      >
        <div className="mt-3">
          <Input
            label="Email nuevo"
            type="email"
            autoComplete="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmingDelete}
        danger
        title="Borrar cuenta"
        message="Se van a eliminar tu cuenta y todos tus datos (cuentas, transacciones, categorías, todo). Esta acción no se puede deshacer."
        confirmLabel={me?.hasPassword === false ? 'Confirmar con Google' : 'Borrar cuenta'}
        loading={deleteAccount.isPending}
        confirmDisabled={me?.hasPassword !== false && deletePassword.trim() === ''}
        onConfirm={handleDelete}
        onCancel={closeDeleteDialog}
      >
        {me?.hasPassword === false ? (
          <p className="mt-3 text-sm text-muted">
            Entraste con Google, así que te vamos a pedir que lo confirmes de nuevo antes de
            borrar nada.
          </p>
        ) : (
          <div className="mt-3">
            <Input
              label="Confirmá tu contraseña para continuar"
              type="password"
              autoComplete="current-password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && deletePassword.trim() !== '') handleDelete();
              }}
            />
          </div>
        )}
      </ConfirmDialog>
    </section>
  );
}
