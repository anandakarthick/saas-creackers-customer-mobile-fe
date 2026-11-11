import apiClient, { http } from './client';
import { ENDPOINTS } from '@/config/api';

export interface CustomerListParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
}

export const getCustomers = async (params?: CustomerListParams) => {
  const res = await apiClient.get<any>(ENDPOINTS.CUSTOMERS, { params });
  return res.data;
};

export const getCustomer = (id: number | string) =>
  http.get<any>(`${ENDPOINTS.CUSTOMERS}/${id}`);

export const getCustomerStats = () => http.get<any>(ENDPOINTS.CUSTOMER_STATS);

export const createCustomer = (data: any) =>
  http.post<any>(ENDPOINTS.CUSTOMERS, data);

export const updateCustomer = (id: number | string, data: any) =>
  http.put<any>(`${ENDPOINTS.CUSTOMERS}/${id}`, data);

export const deleteCustomer = (id: number | string) =>
  http.delete<any>(`${ENDPOINTS.CUSTOMERS}/${id}`);
