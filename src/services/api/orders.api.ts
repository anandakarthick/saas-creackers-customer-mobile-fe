import apiClient, { http } from './client';
import { ENDPOINTS } from '@/config/api';
import { offlineMutation } from '@/services/offline/offlineMutation';

export interface OrderListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  paymentStatus?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const getOrders = async (params?: OrderListParams) => {
  const res = await apiClient.get<any>(ENDPOINTS.ORDERS, { params });
  return res.data;
};

export const getOrder = (id: number | string) =>
  http.get<any>(`${ENDPOINTS.ORDERS}/${id}`);

export const getOrderStats = () => http.get<any>(ENDPOINTS.ORDER_STATS);

// The backend enum is upper-case (PENDING, CONFIRMED, …); screens keep
// statuses lower-case for display, so normalise here or the API rejects it.
export const updateOrderStatus = (id: number | string, status: string, internalNotes?: string) => {
  const body: { status: string; internalNotes?: string } = { status: String(status).toUpperCase() };
  if (internalNotes && internalNotes.trim()) body.internalNotes = internalNotes.trim();
  return offlineMutation({
    url: `${ENDPOINTS.ORDERS}/${id}/status`,
    method: 'PUT',
    body,
    label: `Update order #${id} → ${body.status}`,
    apiFn: () => http.put<any>(`${ENDPOINTS.ORDERS}/${id}/status`, body),
  });
};

/**
 * Download the invoice PDF for an order. Returns an ArrayBuffer (binary).
 * The caller is responsible for saving/sharing the bytes.
 */
export const downloadInvoice = async (id: number | string): Promise<ArrayBuffer> => {
  const res = await apiClient.get<ArrayBuffer>(`${ENDPOINTS.ORDERS}/${id}/invoice`, {
    responseType: 'arraybuffer',
  });
  return res.data;
};

/** Email the invoice PDF to the customer on file. */
export const sendInvoiceEmail = (id: number | string) =>
  http.post<{ sent: boolean }>(`${ENDPOINTS.ORDERS}/${id}/send-invoice`);

/** Send invoice PDF to customer's WhatsApp via server-side session. */
export const sendWhatsAppInvoice = (id: number | string) =>
  http.post<any>(`${ENDPOINTS.ORDERS}/${id}/whatsapp-invoice`);

/** Cancel specific line items on an order. Backend restores inventory and rebates totals. */
export const cancelOrderItems = (
  orderId: number | string,
  itemIds: number[],
  opts: { refundAmount?: number; notes?: string } = {},
) => {
  const body = { itemIds, refundAmount: opts.refundAmount, notes: opts.notes };
  return offlineMutation({
    url: `${ENDPOINTS.ORDERS}/${orderId}/cancel-items`,
    method: 'POST',
    body,
    label: `Cancel items on order #${orderId}`,
    apiFn: () => http.post<any>(`${ENDPOINTS.ORDERS}/${orderId}/cancel-items`, body),
  });
};

/** Add a new product line to an existing order. */
export const addOrderItem = (
  orderId: number | string,
  productId: number,
  quantity: number,
) => {
  const body = { productId, quantity };
  return offlineMutation({
    url: `${ENDPOINTS.ORDERS}/${orderId}/items`,
    method: 'POST',
    body,
    label: `Add item to order #${orderId}`,
    apiFn: () => http.post<any>(`${ENDPOINTS.ORDERS}/${orderId}/items`, body),
  });
};

/** Change the quantity of a single order line item. */
export const updateOrderItemQuantity = (
  orderId: number | string,
  itemId: number | string,
  quantity: number,
) =>
  offlineMutation({
    url: `${ENDPOINTS.ORDERS}/${orderId}/items/${itemId}`,
    method: 'PATCH',
    body: { quantity },
    label: `Update quantity on order #${orderId}`,
    apiFn: () => http.patch<any>(`${ENDPOINTS.ORDERS}/${orderId}/items/${itemId}`, { quantity }),
  });

/** Record a payment against an unpaid / partially-paid order. */
export const addOrderPayment = (
  orderId: number | string,
  body: { method: string; amount: number; reference?: string; notes?: string },
) =>
  offlineMutation({
    url: `${ENDPOINTS.ORDERS}/${orderId}/payments`,
    method: 'POST',
    body,
    label: `Order payment · ₹${body.amount.toFixed(2)} (${body.method})`,
    apiFn: () => http.post<any>(`${ENDPOINTS.ORDERS}/${orderId}/payments`, body),
  });
