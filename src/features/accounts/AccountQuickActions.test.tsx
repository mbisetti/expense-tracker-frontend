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

  // S43 rompe a propósito el "CRYPTO es idéntica a INVESTMENT" que fijaba S40 (D10). Ese
  // invariante valía cuando ninguna de las dos tenía nada propio; ahora CRYPTO tiene tenencias y
  // por lo tanto una acción más. Lo que SIGUE siendo cierto —y es lo que importa de D10— es que
  // las dos comparten el mismo camino de inversión: aportar, retirar y actualizar el valor.
  it('S43: CRYPTO suma [Compré / Vendí] sobre las acciones de una inversión', () => {
    expect(actionsFor(account('CRYPTO'))).toEqual(['add', 'withdraw', 'trade', 'adjust']);
    // Nada se perdió: todo lo de INVESTMENT sigue estando.
    for (const action of actionsFor(account('INVESTMENT'))) {
      expect(actionsFor(account('CRYPTO'))).toContain(action);
    }
  });

  it('S43: INVESTMENT NO ofrece comprar/vender — las tenencias son sólo de cripto en v1', () => {
    // El modelo del backend es genérico; lo que falta para aflojar el gate es un feed de precios
    // de acciones y CEDEARs. Decisión de Marko: "solo cripto pero dejarlo a mano".
    expect(actionsFor(account('INVESTMENT'))).not.toContain('trade');
  });

  it('S43: la cripto muestra el botón con el copy del usuario, no el del exchange', () => {
    render(<AccountQuickActions account={account('CRYPTO')} onAction={() => {}} />);

    expect(screen.getByRole('button', { name: 'Compré / Vendí' })).toBeInTheDocument();
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

  // S46 (D5) da vuelta lo que S40 había fijado acá: efectivo, banco y billetera SÍ ofrecen el
  // ajuste. El server los rechazaba, y por eso un usuario nuevo no tenía forma de decir "hoy
  // tengo 500k en el banco"; ahora es el saldo inicial de la guía y la conciliación de siempre.
  it('S46: efectivo, banco y billetera ofrecen actualizar saldo', () => {
    for (const type of ['CASH', 'BANK', 'WALLET'] as AccountType[]) {
      expect(actionsFor(account(type))).toEqual(['adjust']);
    }

    render(<AccountQuickActions account={account('BANK')} onAction={() => {}} />);
    // El copy cambia con el tipo: una inversión VALE, en el banco lo que hay es plata.
    expect(screen.getByRole('button', { name: 'Actualizar saldo' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Actualizar valor' })).not.toBeInTheDocument();
  });

  it('la tarjeta de crédito sigue sin acciones: su saldo es el resumen del ciclo', () => {
    expect(actionsFor(account('CREDIT'))).toEqual([]);
  });

  it('propaga la acción elegida', () => {
    const onAction = vi.fn();
    render(<AccountQuickActions account={account('INVESTMENT')} onAction={onAction} />);

    fireEvent.click(screen.getByRole('button', { name: 'Retirar' }));
    expect(onAction).toHaveBeenCalledWith('withdraw');
  });
});
