import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AccountQuickActions } from './AccountQuickActions';
import { actionsFor } from './quickActions';
import type { Account, AccountType, SystemAccountRole } from './api';

function account(type: AccountType, systemRole?: SystemAccountRole): Account {
  return {
    id: 'a1',
    name: 'Balanz',
    type,
    currency: 'ARS',
    balance: 0,
    isInformal: false,
    createdAt: '2026-01-01T00:00:00',
    statementCloseDay: null,
    paymentDueDay: null,
    balances: [],
    institution: null,
    linkedAccountId: null,
    systemRole: systemRole ?? null,
  };
}

describe('AccountQuickActions (S40 D4)', () => {
  it('una inversión ofrece agregar, retirar y actualizar valor', () => {
    render(<AccountQuickActions account={account('INVESTMENT')} onAction={() => {}} />);

    expect(screen.getByRole('button', { name: 'Agregar plata' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retirar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Actualizar valor' })).toBeInTheDocument();
  });

  it('D10: CRYPTO es idéntica a INVESTMENT — un solo camino de código', () => {
    expect(actionsFor(account('CRYPTO'))).toEqual(actionsFor(account('INVESTMENT')));
  });

  it('una deuda ofrece registrar pago y ajustar deuda (con su propio copy)', () => {
    render(<AccountQuickActions account={account('DEBT')} onAction={() => {}} />);

    expect(screen.getByRole('button', { name: 'Registrar pago' })).toBeInTheDocument();
    // En una deuda no se pregunta cuánto "vale": se pregunta cuánto debés.
    expect(screen.getByRole('button', { name: 'Ajustar deuda' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Actualizar valor' })).not.toBeInTheDocument();
  });

  it('la cuenta sistema "Deudas con amigos" NO ofrece acciones genéricas', () => {
    // Un pago genérico bajaría el saldo sin cerrar ninguna deuda concreta y desincronizaría el
    // desglose por persona (§7.5 del spec). Se salda desde el bloque Debés.
    const { container } = render(
      <AccountQuickActions account={account('DEBT', 'FRIEND_DEBTS')} onAction={() => {}} />,
    );
    expect(actionsFor(account('DEBT', 'FRIEND_DEBTS'))).toEqual([]);
    expect(container).toBeEmptyDOMElement();
  });

  it('el resto de los tipos no muestra la fila (como antes de S40)', () => {
    for (const type of ['CASH', 'BANK', 'WALLET', 'CREDIT'] as AccountType[]) {
      expect(actionsFor(account(type))).toEqual([]);
    }
  });

  it('propaga la acción elegida', () => {
    const onAction = vi.fn();
    render(<AccountQuickActions account={account('INVESTMENT')} onAction={onAction} />);

    fireEvent.click(screen.getByRole('button', { name: 'Retirar' }));
    expect(onAction).toHaveBeenCalledWith('withdraw');
  });
});
