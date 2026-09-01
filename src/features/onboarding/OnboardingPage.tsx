import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { FeatherIcon } from '../../components/ui/icons';
import { useToast } from '../../components/ui/toastContext';
import { useAccounts } from '../accounts/useAccounts';
import { useUpdateMe } from '../auth/useMe';
import { StepAccounts } from './StepAccounts';
import { StepBalances } from './StepBalances';
import { StepBot } from './StepBot';
import { StepFirstMovement } from './StepFirstMovement';
import { StepWelcome } from './StepWelcome';
import { useCompleteOnboarding } from './useOnboarding';

const TOTAL_STEPS = 5;

/**
 * S46 — la guía de primeros pasos, que al mismo tiempo carga.
 *
 * Es una PÁGINA y no una cadena de modales (D1): los pasos tienen formularios de verdad, y un
 * modal encadenado que no se puede cerrar es una trampa. Se llega recién registrado (D3) o desde
 * el CTA del dashboard vacío (D9).
 *
 * Vive fuera de AppLayout a propósito: no hay a dónde volver todavía, y la nav de una app vacía
 * son cinco links a cinco pantallas sin datos. La salida siempre existe y es "Saltar por ahora".
 *
 * El orden de los pasos NO es estético: el saldo va antes del primer gasto porque el guard
 * INSUFFICIENT_BALANCE rebota cualquier gasto contra una cuenta en cero.
 */
export function OnboardingPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const accounts = useAccounts();
  const updateMe = useUpdateMe();
  const completeOnboarding = useCompleteOnboarding();

  const [step, setStep] = useState(1);
  // Default ARS (D6) aunque el perfil diga otra cosa: el alta deja a TODO el mundo en USD
  // (Google lo hardcodea) y este paso existe justamente para corregirlo.
  const [currency, setCurrency] = useState('ARS');

  const list = accounts.data ?? [];

  /**
   * Salir del wizard, por donde sea. Marca `onboarded` y navega.
   *
   * Navega TAMBIÉN si el POST falla (onSettled y no onSuccess): dejar a alguien encerrado en la
   * guía porque se cayó la red es peor que mostrarle la guía una vez de más.
   */
  const leave = (to: string, message?: string) => {
    completeOnboarding.mutate(undefined, {
      onSettled: () => {
        navigate(to, { replace: true });
        if (message) toast.success(message);
      },
    });
  };

  const next = () => {
    if (step === 1) {
      updateMe.mutate(
        { defaultCurrency: currency },
        {
          onSuccess: () => setStep(2),
          onError: () => toast.error('No pudimos guardar la moneda. Probá de nuevo.'),
        },
      );
      return;
    }
    setStep((current) => Math.min(current + 1, TOTAL_STEPS));
  };

  // Sin cuentas no hay saldo que cargar ni gasto que anotar: los dos pasos siguientes quedarían
  // vacíos. Saltar sigue disponible, así que nadie queda encerrado (D4).
  const blockedWithoutAccounts = step === 2 && list.length === 0;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-4 py-8 text-left">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 font-semibold text-brand">
            <FeatherIcon className="h-5 w-5" />
            Maat
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={() => leave('/dashboard')}>
            Saltar por ahora
          </Button>
        </div>

        <ProgressBar
          ratio={step / TOTAL_STEPS}
          tone="brand"
          label={`Paso ${step} de ${TOTAL_STEPS}`}
        />
        <p className="text-sm text-muted">
          Paso {step} de {TOTAL_STEPS}
        </p>
      </header>

      {step === 1 && (
        <StepWelcome
          currency={currency}
          onCurrencyChange={setCurrency}
          disabled={updateMe.isPending}
        />
      )}
      {step === 2 && <StepAccounts accounts={list} isPending={accounts.isPending} />}
      {step === 3 && <StepBalances accounts={list} />}
      {step === 4 && (
        <StepFirstMovement accounts={list} onGoToImport={() => leave('/datos')} />
      )}
      {step === 5 && <StepBot onGoToBot={() => leave('/telegram')} />}

      <footer className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          {step > 1 && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setStep((current) => current - 1)}
            >
              Atrás
            </Button>
          )}

          {step < TOTAL_STEPS ? (
            <Button
              type="button"
              onClick={next}
              loading={step === 1 && updateMe.isPending}
              disabled={blockedWithoutAccounts}
            >
              Siguiente
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => leave('/dashboard', '¡Listo! Esto es tuyo ahora.')}
              loading={completeOnboarding.isPending}
            >
              Listo
            </Button>
          )}
        </div>

        {blockedWithoutAccounts && (
          <p className="text-sm text-muted">
            Agregá al menos una cuenta para seguir, o saltá la guía y hacelo después.
          </p>
        )}
      </footer>
    </main>
  );
}
