import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SettingsPage } from './SettingsPage';

afterEach(() => {
  localStorage.clear();
});

describe('SettingsPage', () => {
  it('muestra tema, formato de fecha y accesos a categorías y métodos de pago', () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Ajustes' })).toBeInTheDocument();
    expect(screen.getByText('Tema')).toBeInTheDocument();
    expect(screen.getByLabelText('Formato de fecha', { exact: false })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Categorías' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Métodos de pago' })).toBeInTheDocument();
  });

  it('elegir formato de fecha yankee lo persiste en localStorage', () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('Formato de fecha', { exact: false }), {
      target: { value: 'us' },
    });
    expect(localStorage.getItem('dateFormat')).toBe('us');
  });
});
