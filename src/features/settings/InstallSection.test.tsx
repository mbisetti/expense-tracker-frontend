import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { InstallSection } from './InstallSection';
import type { InstallStatus } from '../../lib/useInstallPrompt';

const install = vi.hoisted(() => ({
  status: 'promptable' as InstallStatus,
  justInstalled: false,
  promptInstall: vi.fn(),
}));

vi.mock('../../lib/useInstallPrompt', () => ({
  useInstallPrompt: () => install,
}));

function renderSection() {
  render(
    <ToastProvider>
      <InstallSection />
    </ToastProvider>,
  );
}

beforeEach(() => {
  install.status = 'promptable';
  install.justInstalled = false;
  install.promptInstall.mockClear();
});

describe('InstallSection', () => {
  it('con el evento capturado ofrece el botón y dispara el prompt nativo', () => {
    renderSection();

    expect(screen.getByRole('heading', { name: 'Instalar la app' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Instalar' }));

    expect(install.promptInstall).toHaveBeenCalledTimes(1);
  });

  it('en iOS muestra las instrucciones en vez del botón', () => {
    install.status = 'ios';
    renderSection();

    expect(screen.queryByRole('button', { name: 'Instalar' })).not.toBeInTheDocument();
    expect(screen.getByText(/Agregar a la pantalla de inicio/)).toBeInTheDocument();
  });

  it('si el usuario canceló el prompt, explica cómo reintentar', () => {
    install.status = 'dismissed';
    renderSection();

    expect(screen.queryByRole('button', { name: 'Instalar' })).not.toBeInTheDocument();
    expect(screen.getByText(/Recargá la página/)).toBeInTheDocument();
  });

  // Ya instalada, o browser que no sabe instalar: la sección no existe (nada invasivo, D7).
  it('oculta la sección cuando no hay nada que ofrecer', () => {
    install.status = 'hidden';
    renderSection();

    expect(screen.queryByRole('heading', { name: 'Instalar la app' })).not.toBeInTheDocument();
  });

  it('al instalarse avisa con un toast y se esconde', () => {
    install.status = 'hidden';
    install.justInstalled = true;
    renderSection();

    expect(screen.queryByRole('heading', { name: 'Instalar la app' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Maat quedó instalada');
  });
});
