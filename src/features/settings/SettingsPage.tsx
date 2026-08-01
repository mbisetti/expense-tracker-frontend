import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/toastContext';
import { useTheme } from '../../lib/useTheme';
import { useDateFormat, type DateFormatPref } from '../../lib/dateFormat';
import { useCalendar, type CalendarPref } from '../../lib/useCalendar';
import { useAuth } from '../auth/useAuth';
import { useDeleteAccount, type DeleteAccountProof } from '../auth/useDeleteAccount';
import { signInWithGoogle } from '../../lib/googleAuth';
import { useMe, useUpdateMe } from '../auth/useMe';
import { NotificationsSection } from '../notifications/NotificationsSection';
import { TelegramSection } from '../telegram/TelegramSection';
import { InstallSection } from './InstallSection';
import { MoonIcon, SunIcon } from '../../components/ui/icons';

// Moneda favorita: opciones curadas (Sprint 22.1). Si el usuario tuviera otra guardada,
// se agrega al principio para no perderla del selector.
const FAV_CURRENCIES = ['ARS', 'USD', 'EUR'];
const CURRENCY_LABEL: Record<string, string> = {
  ARS: 'Peso argentino (ARS)',
  USD: 'Dólar (USD)',
  EUR: 'Euro (EUR)',
};

// "Ajustes y preferencias" — segunda entrada del menú de la persona. Tema, formato de fecha y
// calendario de feriados; abajo, en la misma pantalla, la acción destructiva de borrar cuenta.
export function SettingsPage() {
  const { theme, toggle: toggleTheme } = useTheme();
  const { pref: dateFmt, set: setDateFmt } = useDateFormat();
  const { calendar, set: setCalendar } = useCalendar();

  const { data: me } = useMe();
  const updateMe = useUpdateMe();

  const { setAccessToken } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const deleteAccount = useDeleteAccount();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  const favCurrencyOptions =
    me && !FAV_CURRENCIES.includes(me.defaultCurrency)
      ? [me.defaultCurrency, ...FAV_CURRENCIES]
      : FAV_CURRENCIES;

  const changeFavCurrency = (defaultCurrency: string) => {
    updateMe.mutate(
      { defaultCurrency },
      {
        onSuccess: () => toast.success('Moneda favorita actualizada.'),
        onError: () => toast.error('No se pudo actualizar la moneda favorita.'),
      },
    );
  };

  // S7: borrar la cuenta pide probar identidad de nuevo. El token dice "alguien entró alguna
  // vez"; para algo irreversible hace falta "sos vos, ahora".
  const runDelete = (proof: DeleteAccountProof) => {
    deleteAccount.mutate(proof, {
      onSuccess: () => {
        // Cuenta borrada en el server → limpiamos la sesión local y salimos.
        setAccessToken(null);
        queryClient.clear();
        navigate('/login', { replace: true });
      },
      onError: (error) => {
        // El 401 REAUTH_REQUIRED NO es sesión vencida: el usuario sigue logueado y el diálogo
        // queda abierto para reintentar. Cerrarlo o desloguearlo sería castigar un typo.
        if (error.status === 401) {
          setDeletePassword('');
          // El mensaje sale de la prueba que MANDAMOS, no de me?.hasPassword: si el perfil no
          // cargó, decirle "no se pudo confirmar con Google" a alguien que acaba de tipear una
          // contraseña es peor que no decir nada.
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
      // Usuario Google-only: no tiene contraseña que escribir, así que revalidamos con Google.
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
      <h1>Ajustes y preferencias</h1>

      <Card>
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-ink">Preferencias</h2>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-ink">Tema</span>
              <span className="text-sm text-muted">
                Actualmente: {theme === 'dark' ? 'oscuro' : 'claro'}
              </span>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={toggleTheme}
              leftIcon={theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            >
              {theme === 'dark' ? 'Cambiar a claro' : 'Cambiar a oscuro'}
            </Button>
          </div>

          <Select
            label="Moneda favorita"
            id="favorite-currency"
            value={me?.defaultCurrency ?? ''}
            disabled={!me || updateMe.isPending}
            onChange={(e) => changeFavCurrency(e.target.value)}
            helper="Se usa para el total consolidado y para estimar equivalencias de otras monedas."
          >
            {favCurrencyOptions.map((c) => (
              <option key={c} value={c}>
                {CURRENCY_LABEL[c] ?? c}
              </option>
            ))}
          </Select>

          <Select
            label="Formato de fecha"
            id="date-format"
            value={dateFmt}
            onChange={(e) => setDateFmt(e.target.value as DateFormatPref)}
            helper="Cómo se muestran las fechas en la app."
          >
            <option value="ar">DD/MM/AAAA</option>
            <option value="us">MM/DD/AAAA</option>
          </Select>

          <Select
            label="Calendario"
            id="calendar"
            value={calendar}
            onChange={(e) => setCalendar(e.target.value as CalendarPref)}
            helper="Feriados que se usan para calcular los días hábiles."
          >
            <option value="AR">Argentina</option>
            <option value="US">Estados Unidos</option>
          </Select>
        </div>
      </Card>

      {/* S35: instalar la PWA. Se oculta sola si ya está instalada o si el browser no sabe. */}
      <InstallSection />

      {/* S34: qué notificaciones recibir y por qué canal. */}
      <NotificationsSection />

      {/* S30: vincular el bot de Telegram (oculto si el backend no tiene bot configurado). */}
      <TelegramSection />

      <Card>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold text-ink">Cuenta</h2>
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
