import apiClient, { http } from './client';
import { ENDPOINTS } from '@/config/api';

export const getSuppliers = async (params?: { page?: number; limit?: number; search?: string; isActive?: boolean }) => {
  const res = await apiClient.get<any>(ENDPOINTS.SUPPLIERS, { params });
  return res.data;
};

export const getSupplier = (id: number | string) =>
  http.get<any>(`${ENDPOINTS.SUPPLIERS}/${id}`);

export const getSupplierStats = () => http.get<any>(ENDPOINTS.SUPPLIER_STATS);

export const createSupplier = (data: any) => http.post<any>(ENDPOINTS.SUPPLIERS, data);

export const updateSupplier = (id: number | string, data: any) =>
  http.put<any>(`${ENDPOINTS.SUPPLIERS}/${id}`, data);

export const deleteSupplier = (id: number | string) =>
  http.delete<any>(`${ENDPOINTS.SUPPLIERS}/${id}`);

// Purchase orders
export const getPurchaseOrders = async (params?: { page?: number; limit?: number; search?: string; status?: string }) => {
  const res = await apiClient.get<any>(ENDPOINTS.PURCHASE_ORDERS, { params });
  return res.data;
};

export const getPurchaseOrder = (id: number | string) =>
  http.get<any>(`${ENDPOINTS.PURCHASE_ORDERS}/${id}`);

export const createPurchaseOrder = (data: any) =>
  http.post<any>(ENDPOINTS.PURCHASE_ORDERS, data);

export const updatePurchaseOrder = (id: number | string, data: any) =>
  http.put<any>(`${ENDPOINTS.PURCHASE_ORDERS}/${id}`, data);

export const deletePurchaseOrder = (id: number | string) =>
  http.delete<any>(`${ENDPOINTS.PURCHASE_ORDERS}/${id}`);
