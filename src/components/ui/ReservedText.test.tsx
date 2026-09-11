import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReservedText } from './ReservedText';

// jsdom no hace layout, así que lo que se puede fijar acá no es el alto sino el MECANISMO que lo
// mantiene estable: que la variante más larga esté siempre en el DOM ocupando lugar, y que no se
// lea dos veces. Si alguien saca el fantasma, el texto vuelve a saltar y esto se pone rojo.
describe('ReservedText', () => {
  const SHORT = 'Montos tal como los anotaste.';
  const LONG = 'Montos en pesos de julio 2026, según el IPC del INDEC.';

  it('con la variante corta deja la larga en el DOM, reservando el lugar', () => {
    render(<ReservedText longest={LONG}>{SHORT}</ReservedText>);

    expect(screen.getByText(SHORT)).toBeInTheDocument();
    expect(screen.getByText(LONG)).toBeInTheDocument();
  });

  it('el fantasma no lo lee el lector de pantalla', () => {
    render(<ReservedText longest={LONG}>{SHORT}</ReservedText>);

    expect(screen.getByText(LONG)).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText(SHORT)).not.toHaveAttribute('aria-hidden');
  });

  // Si el texto vigente YA es el más largo, un fantasma idéntico sería un duplicado: la frase
  // aparecería dos veces en el DOM y cualquier getByText encontraría dos nodos.
  it('cuando el texto vigente ya es el más largo no hay fantasma', () => {
    render(<ReservedText longest={LONG}>{LONG}</ReservedText>);

    expect(screen.getByText(LONG)).toBeInTheDocument();
    expect(screen.getByText(LONG)).not.toHaveAttribute('aria-hidden');
  });

  it('las dos variantes van en la misma celda del grid, que es lo que las apila', () => {
    const { container } = render(<ReservedText longest={LONG}>{SHORT}</ReservedText>);

    expect(container.firstChild).toHaveClass('grid');
    for (const text of [SHORT, LONG]) {
      expect(screen.getByText(text)).toHaveClass('col-start-1', 'row-start-1');
    }
  });
});
