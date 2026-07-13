export type SavingsGoalResponse = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  /** YYYY-MM-DD o null */
  deadline: string | null;
};
