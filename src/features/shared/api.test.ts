import { describe, expect, it } from 'vitest';
import { splitEvenly, yourPart } from './api';

describe('splitEvenly', () => {
  it('divide entre vos y los demás', () => {
    // 30.000 ÷ 3 (vos + 2) → 10.000 para cada uno de ellos.
    expect(splitEvenly(30000, 2)).toEqual([10000, 10000]);
  });

  it('el resto de la división queda de TU lado, nunca del de ellos', () => {
    // La división es en CENTAVOS: 30.001 ÷ 3 = 10.000,3333 → a ellos les toca 10.000,33 (piso)
    // y el centavo que sobra cae en tu parte. Cobrarle a alguien un centavo de más por un
    // redondeo es exactamente lo que no queremos.
    const parts = splitEvenly(30001, 2);
    expect(parts).toEqual([10000.33, 10000.33]);
    expect(yourPart(30001, parts)).toBe(10000.34);
  });

  it('funciona con centavos', () => {
    const parts = splitEvenly(100.5, 1);
    expect(parts).toEqual([50.25]);
    expect(yourPart(100.5, parts)).toBe(50.25);
  });

  it('sin gente no reparte nada', () => {
    expect(splitEvenly(30000, 0)).toEqual([]);
  });
});

describe('yourPart', () => {
  it('es el total menos las partes ajenas', () => {
    expect(yourPart(30000, [10000, 10000])).toBe(10000);
  });

  it('puede ser 0: un gasto 100% de otro', () => {
    expect(yourPart(30000, [30000])).toBe(0);
  });

  it('da negativo cuando el reparto se pasa del total (lo usa la validación del form)', () => {
    expect(yourPart(30000, [20000, 20000])).toBeLessThan(0);
  });

  it('no arrastra error de punto flotante', () => {
    // 0.1 + 0.2 en coma flotante da 0.30000000000000004; la aritmética va en centavos.
    expect(yourPart(0.3, [0.1, 0.2])).toBe(0);
  });
});
