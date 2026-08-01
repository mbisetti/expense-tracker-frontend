import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { UpdateToast } from './UpdateToast';

// El store real vive en `lib/pwa` y lo alimenta el service worker, que en vitest no existe:
// se mockea el módulo para poder empujar un "hay build nueva" a mano.
const pwa = vi.hoisted(() => ({
  waiting: null as ServiceWorker | null,
  subscribers: new Set<() => void>(),
  applyUpdate: vi.fn(),
}));

vi.mock('../lib/pwa', () => ({
  subscribeToUpdate: (notify: () => void) => {
    pwa.subscribers.add(notify);
    return () => pwa.subscribers.delete(notify);
  },
  getWaitingWorker: () => pwa.waiting,
  applyUpdate: pwa.applyUpdate,
}));

function announce(worker: ServiceWorker | null) {
  act(() => {
    pwa.waiting = worker;
    pwa.subscribers.forEach((notify) => notify());
  });
}

const workerA = { id: 'a' } as unknown as ServiceWorker;
const workerB = { id: 'b' } as unknown as ServiceWorker;

beforeEach(() => {
  pwa.waiting = null;
  pwa.subscribers.clear();
  pwa.applyUpdate.mockClear();
});

describe('UpdateToast', () => {
  it('sin build nueva esperando no muestra nada', () => {
    render(<UpdateToast />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('avisa cuando queda una build nueva esperando', () => {
    render(<UpdateToast />);
    announce(workerA);

    expect(screen.getByRole('status')).toHaveTextContent('Hay una versión nueva.');
    expect(screen.getByRole('button', { name: 'Actualizar' })).toBeInTheDocument();
  });

  // La recarga NUNCA es automática (D3): la dispara el usuario.
  it('Actualizar aplica el update', () => {
    render(<UpdateToast />);
    announce(workerA);

    fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));

    expect(pwa.applyUpdate).toHaveBeenCalledTimes(1);
  });

  it('«Ahora no» lo esconde, pero una build POSTERIOR vuelve a avisar', () => {
    render(<UpdateToast />);
    announce(workerA);

    fireEvent.click(screen.getByRole('button', { name: 'Ahora no' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    announce(workerB);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
