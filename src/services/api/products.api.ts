import apiClient from './client';
import { http } from './client';
import { ENDPOINTS } from '@/config/api';
import { Platform } from 'react-native';

// ── FormData helpers for image uploads ──────────────────────

type Envelope<T> = { success: boolean; data: T; message?: string };

async function postFormData<T>(url: string, formData: FormData): Promise<T> {
  const res = await apiClient.post<Envelope<T>>(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
}

async function putFormData<T>(url: string, formData: FormData): Promise<T> {
  const res = await apiClient.put<Envelope<T>>(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
}

/**
 * Check whether the payload contains locally-picked images (objects with uri/type/fileName).
 * If so, build a FormData instance; otherwise return null so the caller can fall back to JSON.
 */
function buildProductFormData(data: any): FormData | null {
  const images: any[] = Array.isArray(data.images) ? data.images : [];
  const hasLocalFiles = images.some(
    (img: any) => typeof img === 'object' && img !== null && img.uri,
  );

  if (images.length === 0) return null;

  const formData = new FormData();

  // Append every non-image field as a string
  const skipKeys = new Set(['images']);
  for (const [key, val] of Object.entries(data)) {
    if (skipKeys.has(key) || val === undefined || val === null) continue;
    formData.append(key, typeof val === 'object' ? JSON.stringify(val) : String(val));
  }

  // Append images — local picks as file blobs, existing URLs as strings
  images.forEach((img: any) => {
    if (typeof img === 'object' && img.uri) {
      formData.append('images', {
        uri: Platform.OS === 'android' ? img.uri : img.uri.replace('file://', ''),
        type: img.type || 'image/jpeg',
        name: img.fileName || `image_${Date.now()}.jpg`,
      } as any);
    } else if (typeof img === 'string') {
      // Existing server URL — pass as-is so backend can keep it
      formData.append('existingImages', img);
    }
  });

  return formData;
}

// ── API functions ───────────────────────────────────────────

export interface ProductListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  categoryId?: number;
}

export interface PaginatedProducts {
  success: boolean;
  data: any[];
  meta?: { total: number; page: number; limit: number; totalPages: number };
}

export const getProducts = async (params?: ProductListParams): Promise<PaginatedProducts> => {
  const res = await apiClient.get<PaginatedProducts>(ENDPOINTS.PRODUCTS, { params });
  return res.data;
};

export const getProduct = (id: number | string) =>
  http.get<any>(`${ENDPOINTS.PRODUCTS}/${id}`);

export const getProductStats = () => http.get<any>(ENDPOINTS.PRODUCT_STATS);

export const createProduct = (data: any) => {
  const fd = buildProductFormData(data);
  if (fd) return postFormData<any>(ENDPOINTS.PRODUCTS, fd);
  return http.post<any>(ENDPOINTS.PRODUCTS, data);
};

export const updateProduct = (id: number | string, data: any) => {
  const fd = buildProductFormData(data);
  if (fd) return putFormData<any>(`${ENDPOINTS.PRODUCTS}/${id}`, fd);
  return http.put<any>(`${ENDPOINTS.PRODUCTS}/${id}`, data);
};

export const deleteProduct = (id: number | string) =>
  http.delete<any>(`${ENDPOINTS.PRODUCTS}/${id}`);

export const getProductByBarcode = async (code: string): Promise<any> => {
  // 1. Try exact barcode match
  try {
    const result = await http.get<any>(`${ENDPOINTS.PRODUCTS}/by-barcode`, { barcode: code });
    if (result) return result;
  } catch {
    // barcode endpoint returned 404 or error — fall through to SKU search
  }
  // 2. Fallback: search by SKU
  try {
    const res = await apiClient.get<any>(ENDPOINTS.PRODUCTS, {
      params: { search: code, page: 1, limit: 5 },
    });
    const products = res.data?.data || [];
    // Find exact SKU match (case-insensitive)
    const match = products.find(
      (p: any) => p.sku?.toLowerCase() === code.toLowerCase() || p.barcode?.toLowerCase() === code.toLowerCase()
    );
    return match || null;
  } catch {
    return null;
  }
};

/** Stock movement history for a single product. */
export const getProductMovements = (id: number | string, limit = 100) =>
  http.get<any>(`${ENDPOINTS.PRODUCTS}/${id}/movements`, { limit });

// ── Barcode Print Jobs ────────────────────────────────────

export const createBarcodePrintJob = (data: { productIds: number[]; quantityPerProduct?: number }) =>
  http.post<any>(ENDPOINTS.BARCODE_PRINT_JOBS, data);

export const listBarcodePrintJobs = () =>
  http.get<any[]>(ENDPOINTS.BARCODE_PRINT_JOBS);

export const getBarcodePrintJob = (id: number | string) =>
  http.get<any>(`${ENDPOINTS.BARCODE_PRINT_JOBS}/${id}`);

export const downloadBarcodePrintJob = async (id: number | string): Promise<ArrayBuffer> => {
  const res = await apiClient.get<ArrayBuffer>(
    `${ENDPOINTS.BARCODE_PRINT_JOBS}/${id}/download`,
    { responseType: 'arraybuffer' },
  );
  return res.data;
};

export const deleteBarcodePrintJob = (id: number | string) =>
  http.delete<void>(`${ENDPOINTS.BARCODE_PRINT_JOBS}/${id}`);

// ── Bulk Update ───────────────────────────────────────────

export const bulkUpdateProducts = (products: { id: number; [key: string]: any }[]) =>
  http.put<any>(`${ENDPOINTS.PRODUCTS}/bulk-update`, { products });
