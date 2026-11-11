import apiClient, { http } from './client';
import { ENDPOINTS } from '@/config/api';

export interface EstimateItemInput {
  productId?: number | null;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateEstimateInput {
  customerName: string;
  email?: string;
  phone?: string;
  address?: string;
  estimateDate?: string;
  validUntil?: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  notes?: string;
  terms?: string;
  items: EstimateItemInput[];
}

export interface UpdateEstimateInput extends Partial<CreateEstimateInput> {
  status?: string;
}

export interface EstimateListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export const getEstimates = async (params?: EstimateListParams) => {
  const res = await apiClient.get<any>(ENDPOINTS.ESTIMATES, { params });
  return res.data;
};

export const getEstimate = (id: number | string) =>
  http.get<any>(`${ENDPOINTS.ESTIMATES}/${id}`);

export const createEstimate = (data: CreateEstimateInput) =>
  http.post<any>(ENDPOINTS.ESTIMATES, data);

export const updateEstimate = (id: number | string, data: UpdateEstimateInput) =>
  http.put<any>(`${ENDPOINTS.ESTIMATES}/${id}`, data);

export const deleteEstimate = (id: number | string) =>
  http.delete<any>(`${ENDPOINTS.ESTIMATES}/${id}`);

export const getEstimateStats = () =>
  http.get<any>(`${ENDPOINTS.ESTIMATES}/stats`);
