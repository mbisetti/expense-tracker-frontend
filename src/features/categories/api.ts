export type CategoryType = 'INCOME' | 'EXPENSE' | 'BOTH';

export type Category = {
  id: string;
  userId: string | null;
  name: string;
  type: CategoryType;
  color: string | null;
  icon: string | null;
  // Sprint 24: esencial = no recortable (vivienda, salud). Default false.
  isEssential: boolean;
  sourceDefaultCategoryId: string | null;
  createdAt: string;
  /**
   * S51: subcategorías vivas, en su orden. El server siempre manda la lista (vacía si no hay).
   * Opcional porque este tipo lo construyen a mano fixtures de una decena de tests (lección de
   * S38 y S47): nada de la app depende de que esté.
   */
  subcategories?: Subcategory[];
};

// S51: un segundo nivel opcional. No tiene color, tipo ni esencialidad: hereda todo de su
// categoría.
export type Subcategory = {
  id: string;
  name: string;
};
