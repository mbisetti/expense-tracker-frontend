import { afterEach, describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { OfflineBanner } from './OfflineBanner';

function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { value, configurable: true });
  act(() => {
    window.dispatchEvent(new Event(value ? 'online' : 'offline'));
  });
}

afterEach(() => {
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
});

describe('OfflineBanner', () => {
  it('con conexión no muestra nada', () => {
    render(<OfflineBanner />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('al perder la conexión avisa, y al volver desaparece', () => {
    render(<OfflineBanner />);

    setOnline(false);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Sin conexión: los datos no se actualizan hasta que vuelva.',
    );

    setOnline(true);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('si arranca sin conexión, avisa desde el primer render', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    render(<OfflineBanner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
