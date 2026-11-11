import apiClient, { http } from './client';
import { ENDPOINTS } from '@/config/api';
import { offlineMutation } from '@/services/offline/offlineMutation';

// --- Inventory stats ---
export const getInventoryStats = () => http.get<any>('/admin/inventory/stats');

// --- Stock list (products with stock info) ---
export interface StockListParams {
  page?: number;
  limit?: number;
  search?: string;
  lowStock?: boolean;
}

export const getStock = async (params?: StockListParams) => {
  const res = await apiClient.get<any>(ENDPOINTS.STOCK, { params });
  return res.data;
};

// --- Low stock alerts ---
export const getLowStockProducts = () => http.get<any[]>(ENDPOINTS.LOW_STOCK);

// --- Stock valuation (total value grouped by category / branch) ---
export interface StockValuation {
  items: Array<{
    id: number;
    name: string;
    sku: string;
    quantity: number;
    costPrice: number;
    retailPrice: number;
    costValue: number;
    retailValue: number;
    margin: number;
    category?: { id: number; name: string };
  }>;
  summary: {
    totalProducts: number;
    totalItems: number;
    totalCostValue: number;
    totalRetailValue: number;
    totalMargin: number;
  };
}

export const getStockValuation = () => http.get<StockValuation>(ENDPOINTS.STOCK_VALUATION);

// --- Inventory logs (used for GRN history + Adjustments history via type filter) ---
export interface InventoryLogParams {
  page?: number;
  limit?: number;
  type?: string; // e.g. 'PURCHASE' (GRN), 'ADJUSTMENT'
  productId?: number;
  search?: string;
}

const LOGS_ENDPOINT = '/admin/inventory/logs';

export const getInventoryLogs = async (params?: InventoryLogParams) => {
  const res = await apiClient.get<any>(LOGS_ENDPOINT, { params });
  return res.data;
};

// --- GRN history ---
export const getGRNs = async (params?: { page?: number; limit?: number; search?: string }) => {
  const res = await apiClient.get<any>(LOGS_ENDPOINT, {
    params: {
      ...params,
      type: 'PURCHASE',
    }
  });
  return res.data;
};

export const createGRN = (data: any) =>
  offlineMutation({
    url: ENDPOINTS.GRN,
    method: 'POST',
    body: data,
    label: 'Create GRN',
    apiFn: () => http.post<any>(ENDPOINTS.GRN, data),
  });

// --- Stock Adjustments history ---
export const getStockAdjustments = async (params?: { page?: number; limit?: number; search?: string }) => {
  const res = await apiClient.get<any>(LOGS_ENDPOINT, {
    params: {
      ...params,
      type: 'ADJUSTMENT',
    }
  });
  return res.data;
};

// Backend endpoint is POST /admin/inventory/adjust — override here.
export const createStockAdjustment = (data: any) =>
  offlineMutation({
    url: '/admin/inventory/adjust',
    method: 'POST',
    body: data,
    label: 'Stock adjustment',
    apiFn: () => http.post<any>('/admin/inventory/adjust', data),
  });

export const updateStockAdjustment = (id: string | number, data: any) =>
  offlineMutation({
    url: `/admin/inventory/adjust/${id}`,
    method: 'PUT',
    body: data,
    label: 'Update stock adjustment',
    apiFn: () => http.put<any>(`/admin/inventory/adjust/${id}`, data),
  });
