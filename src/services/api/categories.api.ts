import { http } from './client';
import { ENDPOINTS } from '@/config/api';

export const getCategories = () => http.get<any[]>(ENDPOINTS.CATEGORIES);

export const getCategory = (id: number | string) =>
  http.get<any>(`${ENDPOINTS.CATEGORIES}/${id}`);

export const createCategory = (data: any) => http.post<any>(ENDPOINTS.CATEGORIES, data);

export const updateCategory = (id: number | string, data: any) =>
  http.put<any>(`${ENDPOINTS.CATEGORIES}/${id}`, data);

export const deleteCategory = (id: number | string) =>
  http.delete<any>(`${ENDPOINTS.CATEGORIES}/${id}`);
