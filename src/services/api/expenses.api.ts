import apiClient, { http } from './client';
import { ENDPOINTS } from '@/config/api';
import type { Expense, ExpenseStats } from '@/types';

export interface ExpenseListParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  paymentStatus?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const getExpenses = async (params?: ExpenseListParams) => {
  const res = await apiClient.get<any>(ENDPOINTS.EXPENSES, { params });
  return res.data;
};

export const getExpense = (id: number | string) =>
  http.get<Expense>(`${ENDPOINTS.EXPENSES}/${id}`);

export const createExpense = (data: any) =>
  http.post<Expense>(ENDPOINTS.EXPENSES, data);

export const updateExpense = (id: number | string, data: any) =>
  http.put<Expense>(`${ENDPOINTS.EXPENSES}/${id}`, data);

export const deleteExpense = (id: number | string) =>
  http.delete<void>(`${ENDPOINTS.EXPENSES}/${id}`);

export const getExpenseStats = () =>
  http.get<ExpenseStats>(ENDPOINTS.EXPENSE_STATS);
