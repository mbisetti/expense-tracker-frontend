import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

type PromptModule = typeof import('./useInstallPrompt');

// El módulo guarda el evento diferido en estado de módulo (arranca en main.tsx, fuera de
// React): cada test necesita una instancia limpia.
async function loadFresh(): Promise<PromptModule> {
  vi.resetModules();
  const mod = await import('./useInstallPrompt');
  mod.listenForInstallPrompt();
  return mod;
}

function Probe({ useInstallPrompt }: { useInstallPrompt: PromptModule['useInstallPrompt'] }) {
  const { status, justInstalled, promptInstall } = useInstallPrompt();
  return (
    <>
      <span data-testid="status">{status}</span>
      <span data-testid="just-installed">{String(justInstalled)}</span>
      <button type="button" onClick={promptInstall}>
        instalar
      </button>
    </>
  );
}

type FakePromptEvent = Event & {
  prompt: ReturnType<typeof vi.fn>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function fireBeforeInstallPrompt(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const event = new Event('beforeinstallprompt', { cancelable: true }) as FakePromptEvent;
  event.prompt = vi.fn().mockResolvedValue(undefined);
  event.userChoice = Promise.resolve({ outcome });
  act(() => {
    window.dispatchEvent(event);
  });
  return event;
}

const realUserAgent = navigator.userAgent;

afterEach(() => {
  Object.defineProperty(navigator, 'userAgent', { value: realUserAgent, configurable: true });
  vi.unstubAllGlobals();
});

describe('useInstallPrompt', () => {
  it('sin evento y sin iOS, no hay nada que ofrecer', async () => {
    const mod = await loadFresh();
    render(<Probe useInstallPrompt={mod.useInstallPrompt} />);

    expect(screen.getByTestId('status')).toHaveTextContent('hidden');
  });

  it('captura beforeinstallprompt, le corta el default y queda instalable', async () => {
    const mod = await loadFresh();
    render(<Probe useInstallPrompt={mod.useInstallPrompt} />);

    // preventDefault: sin esto Chrome muestra su propia infobar (D7).
    const event = fireBeforeInstallPrompt();

    expect(event.defaultPrevented).toBe(true);
    expect(screen.getByTestId('status')).toHaveTextContent('promptable');
  });

  it('dispara el prompt nativo del evento guardado', async () => {
    const mod = await loadFresh();
    render(<Probe useInstallPrompt={mod.useInstallPrompt} />);
    const event = fireBeforeInstallPrompt();

    fireEvent.click(screen.getByRole('button', { name: 'instalar' }));

    expect(event.prompt).toHaveBeenCalledTimes(1);
  });

  it('si el usuario cancela, el evento se consumió y hay que recargar', async () => {
    const mod = await loadFresh();
    render(<Probe useInstallPrompt={mod.useInstallPrompt} />);
    const event = fireBeforeInstallPrompt('dismissed');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'instalar' }));
      await event.userChoice;
    });

    expect(screen.getByTestId('status')).toHaveTextContent('dismissed');
  });

  it('al instalarse marca justInstalled y esconde la sección', async () => {
    const mod = await loadFresh();
    render(<Probe useInstallPrompt={mod.useInstallPrompt} />);
    fireBeforeInstallPrompt();

    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });

    expect(screen.getByTestId('status')).toHaveTextContent('hidden');
    expect(screen.getByTestId('just-installed')).toHaveTextContent('true');
  });

  it('corriendo ya instalada (standalone) no ofrece instalar de nuevo', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const mod = await loadFresh();
    render(<Probe useInstallPrompt={mod.useInstallPrompt} />);
    fireBeforeInstallPrompt();

    expect(screen.getByTestId('status')).toHaveTextContent('hidden');
  });

  // Safari nunca dispara beforeinstallprompt: sólo quedan las instrucciones manuales.
  it('en iOS cae en las instrucciones', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15',
      configurable: true,
    });
    const mod = await loadFresh();
    render(<Probe useInstallPrompt={mod.useInstallPrompt} />);

    expect(screen.getByTestId('status')).toHaveTextContent('ios');
  });
});
