import apiClient, { http } from './client';
import { ENDPOINTS } from '@/config/api';

/**
 * Returns & notes — same endpoints as the web admin (/admin/sales-returns,
 * /admin/purchase-returns, /admin/credit-notes, /admin/debit-notes).
 */

export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  [key: string]: any;
}

// ── Sales returns ──
export const getSalesReturns = async (params?: ListParams) => {
  const res = await apiClient.get<any>(ENDPOINTS.SALES_RETURNS, { params });
  return res.data;
};
export const getSalesReturn = (id: number | string) => http.get<any>(`${ENDPOINTS.SALES_RETURNS}/${id}`);
export const getReturnableSale = (orderId: number | string) => http.get<any>(`${ENDPOINTS.SALES_RETURNS}/source/${orderId}`);
export const createSalesReturn = (data: any) => http.post<any>(ENDPOINTS.SALES_RETURNS, data);
export const cancelSalesReturn = (id: number | string, reason?: string) => http.post<any>(`${ENDPOINTS.SALES_RETURNS}/${id}/cancel`, { reason });
export const getSalesReturnStats = () => http.get<any>(`${ENDPOINTS.SALES_RETURNS}/stats`);

// ── Purchase returns ──
export const getPurchaseReturns = async (params?: ListParams) => {
  const res = await apiClient.get<any>(ENDPOINTS.PURCHASE_RETURNS, { params });
  return res.data;
};
export const getPurchaseReturn = (id: number | string) => http.get<any>(`${ENDPOINTS.PURCHASE_RETURNS}/${id}`);
export const getReturnablePurchase = (purchaseOrderId: number | string) => http.get<any>(`${ENDPOINTS.PURCHASE_RETURNS}/source/${purchaseOrderId}`);
export const createPurchaseReturn = (data: any) => http.post<any>(ENDPOINTS.PURCHASE_RETURNS, data);
export const cancelPurchaseReturn = (id: number | string, reason?: string) => http.post<any>(`${ENDPOINTS.PURCHASE_RETURNS}/${id}/cancel`, { reason });
export const getPurchaseReturnStats = () => http.get<any>(`${ENDPOINTS.PURCHASE_RETURNS}/stats`);

// ── Credit notes ──
export const getCreditNotes = async (params?: ListParams) => {
  const res = await apiClient.get<any>(ENDPOINTS.CREDIT_NOTES, { params });
  return res.data;
};
export const getCreditNote = (id: number | string) => http.get<any>(`${ENDPOINTS.CREDIT_NOTES}/${id}`);
export const getAvailableCreditNotes = (customerId?: number) => http.get<any[]>(`${ENDPOINTS.CREDIT_NOTES}/available`, customerId ? { customerId } : undefined);
export const createCreditNote = (data: any) => http.post<any>(ENDPOINTS.CREDIT_NOTES, data);
export const applyCreditNote = (id: number | string, data: { orderId?: number | null; amount: number; reference?: string; notes?: string }) =>
  http.post<any>(`${ENDPOINTS.CREDIT_NOTES}/${id}/apply`, data);
export const cancelCreditNote = (id: number | string, reason?: string) => http.post<any>(`${ENDPOINTS.CREDIT_NOTES}/${id}/cancel`, { reason });
export const getCreditNoteStats = () => http.get<any>(`${ENDPOINTS.CREDIT_NOTES}/stats`);

// ── Debit notes ──
export const getDebitNotes = async (params?: ListParams) => {
  const res = await apiClient.get<any>(ENDPOINTS.DEBIT_NOTES, { params });
  return res.data;
};
export const getDebitNote = (id: number | string) => http.get<any>(`${ENDPOINTS.DEBIT_NOTES}/${id}`);
export const getAvailableDebitNotes = (supplierId?: number) => http.get<any[]>(`${ENDPOINTS.DEBIT_NOTES}/available`, supplierId ? { supplierId } : undefined);
export const createDebitNote = (data: any) => http.post<any>(ENDPOINTS.DEBIT_NOTES, data);
export const applyDebitNote = (id: number | string, data: { purchaseOrderId?: number | null; amount: number; reference?: string; notes?: string }) =>
  http.post<any>(`${ENDPOINTS.DEBIT_NOTES}/${id}/apply`, data);
export const cancelDebitNote = (id: number | string, reason?: string) => http.post<any>(`${ENDPOINTS.DEBIT_NOTES}/${id}/cancel`, { reason });
export const getDebitNoteStats = () => http.get<any>(`${ENDPOINTS.DEBIT_NOTES}/stats`);

/** Human labels shared by the screens (mirror backend enums). */
export const REFUND_METHODS = [
  { label: 'Cash', value: 'CASH' },
  { label: 'UPI', value: 'UPI' },
  { label: 'Card', value: 'CARD' },
  { label: 'Bank transfer', value: 'BANK_TRANSFER' },
  { label: 'Credit note', value: 'CREDIT_NOTE' },
  { label: 'No refund', value: 'NONE' },
];
export const SETTLEMENT_METHODS = [
  { label: 'Debit note', value: 'DEBIT_NOTE' },
  { label: 'Supplier refund', value: 'REFUND' },
  { label: 'Adjust payable', value: 'ADJUST_PAYABLE' },
  { label: 'Replacement', value: 'REPLACEMENT' },
  { label: 'None', value: 'NONE' },
];
export const methodLabel = (value: string | null | undefined, list: Array<{ label: string; value: string }>) =>
  list.find((m) => m.value === value)?.label || value || '—';
export const customerLabel = (c?: { firstName?: string; lastName?: string; phone?: string | null } | null, fallback?: string | null) =>
  c ? `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.phone || fallback || 'Walk-in' : fallback || 'Walk-in';
export const errorMessage = (e: any, fallback = 'Something went wrong') =>
  e?.response?.data?.message || (e?.response?.data?.errors && Object.values(e.response.data.errors).flat()[0]) || e?.message || fallback;
