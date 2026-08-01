import { afterEach, describe, expect, it, vi } from 'vitest';

type PwaModule = typeof import('./pwa');

// El worker en espera vive en estado de módulo: instancia limpia por test.
async function loadFresh(): Promise<PwaModule> {
  vi.resetModules();
  return await import('./pwa');
}

class FakeWorker extends EventTarget {
  state = 'installing';
  postMessage = vi.fn();

  transitionTo(state: string) {
    this.state = state;
    this.dispatchEvent(new Event('statechange'));
  }
}

class FakeRegistration extends EventTarget {
  waiting: FakeWorker | null = null;
  installing: FakeWorker | null = null;
  update = vi.fn();
}

// jsdom no implementa ServiceWorkerContainer: se enchufa uno falso en navigator.
function fakeServiceWorker(controller: object | null) {
  const registration = new FakeRegistration();
  const container = Object.assign(new EventTarget(), {
    register: vi.fn().mockResolvedValue(registration),
    controller,
  });
  Object.defineProperty(navigator, 'serviceWorker', { value: container, configurable: true });
  return { registration, container };
}

// Deja que resuelva la promesa de register() antes de seguir.
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  Reflect.deleteProperty(navigator, 'serviceWorker');
  vi.useRealTimers();
});

describe('registerServiceWorker', () => {
  it('en un browser sin service workers no hace nada', async () => {
    const pwa = await loadFresh();
    expect(() => pwa.registerServiceWorker()).not.toThrow();
  });

  it('registra /sw.js en el scope raíz', async () => {
    const { container } = fakeServiceWorker(null);
    const pwa = await loadFresh();

    pwa.registerServiceWorker();

    expect(container.register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
  });

  it('anuncia la build nueva que queda esperando', async () => {
    const { registration } = fakeServiceWorker({});
    const pwa = await loadFresh();
    const notify = vi.fn();
    pwa.subscribeToUpdate(notify);

    pwa.registerServiceWorker();
    await flush();

    const installing = new FakeWorker();
    registration.installing = installing;
    registration.dispatchEvent(new Event('updatefound'));
    installing.transitionTo('installed');

    expect(pwa.getWaitingWorker()).toBe(installing);
    expect(notify).toHaveBeenCalledTimes(1);
  });

  // Primera instalación: no hay controller todavía, no hay build vieja en pantalla y por
  // lo tanto no hay nada que recargar → sin toast.
  it('la primera instalación no dispara el aviso', async () => {
    const { registration } = fakeServiceWorker(null);
    const pwa = await loadFresh();

    pwa.registerServiceWorker();
    await flush();

    const installing = new FakeWorker();
    registration.installing = installing;
    registration.dispatchEvent(new Event('updatefound'));
    installing.transitionTo('installed');

    expect(pwa.getWaitingWorker()).toBeNull();
  });

  it('toma la build que ya estaba esperando al abrir', async () => {
    const { registration } = fakeServiceWorker({});
    const waiting = new FakeWorker();
    registration.waiting = waiting;
    const pwa = await loadFresh();

    pwa.registerServiceWorker();
    await flush();

    expect(pwa.getWaitingWorker()).toBe(waiting);
  });

  it('re-chequea al volver el foco y una vez por hora', async () => {
    const { registration } = fakeServiceWorker({});
    const pwa = await loadFresh();

    // Los timers se falsean ANTES de registrar: el setInterval del chequeo se crea adentro.
    vi.useFakeTimers();
    pwa.registerServiceWorker();
    await vi.advanceTimersByTimeAsync(0);

    window.dispatchEvent(new Event('focus'));
    expect(registration.update).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    expect(registration.update).toHaveBeenCalledTimes(2);
  });
});

describe('applyUpdate', () => {
  it('le pide al worker en espera que tome el control', async () => {
    const { registration } = fakeServiceWorker({});
    const waiting = new FakeWorker();
    registration.waiting = waiting;
    const pwa = await loadFresh();
    pwa.registerServiceWorker();
    await flush();

    pwa.applyUpdate();

    expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
  });

  it('sin nada esperando es un no-op', async () => {
    fakeServiceWorker({});
    const pwa = await loadFresh();

    expect(() => pwa.applyUpdate()).not.toThrow();
  });
});
