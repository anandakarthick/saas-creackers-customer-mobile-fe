import apiClient, { http } from './client';
import { ENDPOINTS } from '@/config/api';

export interface POSSaleItem {
  productId: number;
  quantity: number;
}

export interface CreatePOSSaleInput {
  customerId?: number;
  customerName?: string;
  customerPhone?: string;
  paymentMethod: 'CASH' | 'CARD' | 'UPI' | 'RAZORPAY' | string;
  items: POSSaleItem[];
  discount?: number;
  /** Optional flat ₹ packing add-on. Added on top of (subtotal - discount)
   *  server-side; printed as its own line on the receipt. */
  packingCharges?: number;
  notes?: string;
  amountPaid?: number;
  commissionEnabled?: boolean;
  commissionName?: string;
  commissionPct?: number;
  commissionNotes?: string;
  payments?: { method: string; amount: number }[];
  isEstimate?: boolean;
  isDummy?: boolean;
  taxType?: 'IGST' | 'SGST_CGST';
  taxPercent?: number;
  itemHsns?: Record<string, string>;
  customerAddress?: string;
  customerCity?: string;
  customerPincode?: string;
  fromEstimateId?: number;
  editEstimateId?: number;
}

export interface POSSaleListParams {
  page?: number;
  limit?: number;
  search?: string;
  paymentMethod?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface POSStats {
  totalSales: number;
  todaySales: number;
  todayRevenue: number;
  cashSalesCount: number;
  cashSalesAmount: number;
  digitalSalesCount: number;
  digitalSalesAmount: number;
}

/**
 * Submit a POS sale.
 *
 * Wrapped with offline-queue support: when the device is offline (or the
 * request fails with no HTTP response), we persist the payload to
 * AsyncStorage and return a synthetic optimistic response so the cashier UI
 * can keep flowing (clear cart, print, next customer). The sync runner
 * drains the queue when connectivity returns; the backend's idempotency
 * middleware ensures the sale is created exactly once even if the original
 * request actually succeeded but the response was lost in flight.
 */
import { isOnline } from '@/services/offline/network';
import { enqueueMutation } from '@/services/offline/queue';
import { offlineMutation } from '@/services/offline/offlineMutation';

function totalForLabel(data: CreatePOSSaleInput): number {
  // Items array doesn't carry price — use 0 as fallback. Caller may pass
  // a `__total` prop for nicer queue labels.
  return Number((data as any).__total || 0);
}

function offlineReceipt(offlineId: string, data: CreatePOSSaleInput): any {
  return {
    __offline: true,
    offlineId,
    orderNumber: `OFFLINE-${offlineId.slice(-8).toUpperCase()}`,
    total: totalForLabel(data),
    paymentMethod: data.paymentMethod,
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    items: data.items,
    createdAt: new Date().toISOString(),
  };
}

export const createPOSSale = async (data: CreatePOSSaleInput) => {
  // Pre-flight: known offline → queue immediately, no network attempt.
  if (!isOnline()) {
    const m = await enqueueMutation({
      url: ENDPOINTS.POS_SALES,
      method: 'POST',
      body: data,
      label: `POS sale · ₹${totalForLabel(data).toFixed(2)}`,
    });
    return offlineReceipt(m.id, data);
  }

  try {
    return await http.post<any>(ENDPOINTS.POS_SALES, data);
  } catch (err: any) {
    // No HTTP response → network failure. 4xx errors propagate normally so
    // the UI can show validation messages instead of silently queueing.
    const noResponse = !err?.response || err?.code === 'ERR_NETWORK';
    if (noResponse) {
      const m = await enqueueMutation({
        url: ENDPOINTS.POS_SALES,
        method: 'POST',
        body: data,
        label: `POS sale · ₹${totalForLabel(data).toFixed(2)}`,
      });
      return offlineReceipt(m.id, data);
    }
    throw err;
  }
};

export const getPOSSales = async (params?: POSSaleListParams) => {
  const res = await apiClient.get<any>(ENDPOINTS.POS_SALES, { params });
  return res.data;
};

export const getPOSSale = (id: number | string) =>
  http.get<any>(`${ENDPOINTS.POS_SALES}/${id}`);

export const getPOSStats = () => http.get<POSStats>(ENDPOINTS.POS_STATS);

export const voidPOSSale = (id: number | string, opts: { refundAmount?: number; notes?: string } = {}) => {
  const body = { refundAmount: opts.refundAmount, notes: opts.notes };
  return offlineMutation({
    url: `${ENDPOINTS.POS_SALES}/${id}/void`,
    method: 'PUT',
    body,
    label: `Void POS sale #${id}`,
    apiFn: () => http.put<any>(`${ENDPOINTS.POS_SALES}/${id}/void`, body),
  });
};

/** Cancel specific line items on a POS sale. Restores inventory and rebates totals. */
export const cancelPOSSaleItems = (
  saleId: number | string,
  itemIds: number[],
  opts: { refundAmount?: number; notes?: string } = {},
) => {
  const body = { itemIds, refundAmount: opts.refundAmount, notes: opts.notes };
  return offlineMutation({
    url: `${ENDPOINTS.POS_SALES}/${saleId}/cancel-items`,
    method: 'POST',
    body,
    label: `Cancel items on sale #${saleId}`,
    apiFn: () => http.post<any>(`${ENDPOINTS.POS_SALES}/${saleId}/cancel-items`, body),
  });
};

/** Convert a saved POS estimate into a completed sale. */
export const convertPOSEstimate = (
  saleId: number | string,
  body?: { paymentMethod?: string; amountPaid?: number },
) => {
  const payload = body || {};
  return offlineMutation({
    url: `${ENDPOINTS.POS_SALES}/${saleId}/convert-estimate`,
    method: 'POST',
    body: payload,
    label: `Convert estimate #${saleId}`,
    apiFn: () => http.post<any>(`${ENDPOINTS.POS_SALES}/${saleId}/convert-estimate`, payload),
  });
};

/** Settle additional money against a partially-paid POS sale. */
export const addPOSPayment = (
  saleId: number | string,
  body: { method: string; amount: number; reference?: string; notes?: string },
) =>
  offlineMutation({
    url: `${ENDPOINTS.POS_SALES}/${saleId}/payments`,
    method: 'POST',
    body,
    label: `POS payment · ₹${body.amount.toFixed(2)} (${body.method})`,
    apiFn: () => http.post<any>(`${ENDPOINTS.POS_SALES}/${saleId}/payments`, body),
  });

/** Preview the next sequential POS bill number. Does NOT consume the sequence. */
export const getNextPOSBillNumber = () =>
  http.get<{ billNumber: string }>(ENDPOINTS.POS_NEXT_NUMBER);

/** Create a barcode scan session token for mobile scanner pairing. */
export const createScanSession = (phone: string) =>
  http.post<{ token: string; scanUrl: string }>(ENDPOINTS.POS_SCAN_SESSION, { phone });
