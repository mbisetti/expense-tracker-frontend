import { afterEach, describe, expect, it, vi } from 'vitest';

type OnlineModule = typeof import('./onlineStatus');

// El override nativo vive en estado de módulo: instancia limpia por test.
async function loadFresh(): Promise<OnlineModule> {
  vi.resetModules();
  return await import('./onlineStatus');
}

function setBrowserOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { value, configurable: true });
}

afterEach(() => {
  setBrowserOnline(true);
});

describe('estado de conexión', () => {
  it('en la web manda navigator.onLine, como antes de S44', async () => {
    const { getOnlineSnapshot } = await loadFresh();

    setBrowserOnline(false);
    expect(getOnlineSnapshot()).toBe(false);

    setBrowserOnline(true);
    expect(getOnlineSnapshot()).toBe(true);
  });

  it('avisa a los suscriptos ante los eventos del browser', async () => {
    const { subscribeOnline } = await loadFresh();
    const notify = vi.fn();
    const baja = subscribeOnline(notify);

    window.dispatchEvent(new Event('offline'));
    expect(notify).toHaveBeenCalledOnce();

    baja();
    window.dispatchEvent(new Event('online'));
    expect(notify).toHaveBeenCalledOnce();
  });

  it('el valor nativo PISA al del browser: es el caso de iOS, que siempre dice que hay conexión', async () => {
    const { getOnlineSnapshot, setNativeOnline } = await loadFresh();

    // El WKWebView miente: dice que sí aunque el teléfono esté en modo avión.
    setBrowserOnline(true);
    setNativeOnline(false);

    expect(getOnlineSnapshot()).toBe(false);
  });

  it('el valor nativo notifica sólo cuando cambia de verdad', async () => {
    const { subscribeOnline, setNativeOnline } = await loadFresh();
    const notify = vi.fn();
    subscribeOnline(notify);

    setNativeOnline(false);
    expect(notify).toHaveBeenCalledOnce();

    setNativeOnline(false);
    expect(notify).toHaveBeenCalledOnce();

    setNativeOnline(true);
    expect(notify).toHaveBeenCalledTimes(2);
  });
});
