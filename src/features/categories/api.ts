export type CategoryType = 'INCOME' | 'EXPENSE' | 'BOTH';

export type Category = {
  id: string;
  userId: string | null;
  name: string;
  type: CategoryType;
  color: string | null;
  icon: string | null;
  sourceDefaultCategoryId: string | null;
  createdAt: string;
};
