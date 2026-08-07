import { describe, expect, it } from 'vitest';
import { seriesYieldColor, yieldColor } from './performanceColors';

const INCOME = 'var(--income)';
const EXPENSE = 'var(--expense)';

describe('yieldColor', () => {
  it('un rendimiento NEGATIVO va en rojo, nunca en verde', () => {
    // El bug que arreglo: el gráfico pintaba el rendimiento con `var(--income)` FIJO, así que
    // un "−US$ 15,00" salía verde en la barra, el tooltip y la leyenda. El color decía lo
    // contrario de lo que había pasado.
    expect(yieldColor(-15)).toBe(EXPENSE);
    expect(yieldColor(-0.01)).toBe(EXPENSE);
  });

  it('un rendimiento positivo va en verde', () => {
    expect(yieldColor(15)).toBe(INCOME);
  });

  it('el cero va en verde: no se perdió plata', () => {
    // Mismo criterio que PerformanceSummary y el "Rendimiento acumulado" del detalle, que ya
    // usaban `>= 0`. Un mes plano no es una pérdida.
    expect(yieldColor(0)).toBe(INCOME);
  });
});

describe('seriesYieldColor (el swatch de la leyenda)', () => {
  it('manda el signo del ACUMULADO, no el del último mes', () => {
    // La leyenda es por serie y no puede tener dos colores: dice de qué color viene siendo el
    // gráfico entero. Acá el saldo neto es negativo aunque haya meses buenos.
    expect(seriesYieldColor([100, -50, -80])).toBe(EXPENSE);
    expect(seriesYieldColor([-100, 50, 80])).toBe(INCOME);
  });

  it('una serie vacía o toda en cero no se pinta de pérdida', () => {
    expect(seriesYieldColor([])).toBe(INCOME);
    expect(seriesYieldColor([0, 0, 0])).toBe(INCOME);
  });
});
