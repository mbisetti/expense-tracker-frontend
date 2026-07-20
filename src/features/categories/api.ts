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
};
