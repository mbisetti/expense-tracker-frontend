import { describe, expect, it } from 'vitest';
import { categoryWithSub, subcategoryCount, subcategoryName } from './subcategoryLabel';
import type { Category } from './api';

const boliche: Category = {
  id: 'cat-1',
  userId: 'u1',
  name: 'Boliche',
  type: 'EXPENSE',
  color: '#aa3bff',
  icon: null,
  isEssential: false,
  sourceDefaultCategoryId: null,
  createdAt: '2026-11-01T00:00:00',
  subcategories: [
    { id: 'sub-1', name: 'Transporte' },
    { id: 'sub-2', name: 'Entrada' },
  ],
};

describe('subcategoryLabel', () => {
  it('junta categoría y subcategoría con el separador de la app', () => {
    expect(categoryWithSub('Boliche', 'Transporte')).toBe('Boliche › Transporte');
  });

  it('sin subcategoría devuelve la categoría sola', () => {
    expect(categoryWithSub('Boliche', null)).toBe('Boliche');
    expect(categoryWithSub('Boliche', undefined)).toBe('Boliche');
  });

  it('busca el nombre de la subcategoría dentro de su categoría', () => {
    expect(subcategoryName(boliche, 'sub-2')).toBe('Entrada');
    expect(subcategoryName(boliche, 'otra')).toBeNull();
    expect(subcategoryName(boliche, null)).toBeNull();
    expect(subcategoryName(undefined, 'sub-1')).toBeNull();
    expect(subcategoryName({ ...boliche, subcategories: undefined }, 'sub-1')).toBeNull();
  });

  it('cuenta en singular y en plural', () => {
    expect(subcategoryCount(1)).toBe('1 subcategoría');
    expect(subcategoryCount(4)).toBe('4 subcategorías');
  });
});
