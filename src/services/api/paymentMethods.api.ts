import { http } from './client';
import { ENDPOINTS } from '@/config/api';

export interface PaymentMethod {
  id: number;
  type: string;
  displayName: string;
  description?: string | null;
  imageUrl?: string | null;
  upiId?: string | null;
  upiQrUrl?: string | null;
  gpayNumber?: string | null;
  bankName?: string | null;
  accountHolder?: string | null;
  accountNumber?: string | null;
  ifscCode?: string | null;
  branchName?: string | null;
  razorpayKeyId?: string | null;
  fixedCharge?: number;
  percentCharge?: number;
  minAmount?: number;
  maxAmount?: number | null;
  sortOrder?: number;
  isActive: boolean;
}

export const getPaymentMethods = () =>
  http.get<PaymentMethod[]>(ENDPOINTS.PAYMENT_METHODS);

export const getPaymentMethod = (id: number | string) =>
  http.get<PaymentMethod>(`${ENDPOINTS.PAYMENT_METHODS}/${id}`);

export const createPaymentMethod = (data: Partial<PaymentMethod>) =>
  http.post<PaymentMethod>(ENDPOINTS.PAYMENT_METHODS, data);

export const updatePaymentMethod = (id: number | string, data: Partial<PaymentMethod>) =>
  http.put<PaymentMethod>(`${ENDPOINTS.PAYMENT_METHODS}/${id}`, data);

export const deletePaymentMethod = (id: number | string) =>
  http.delete<any>(`${ENDPOINTS.PAYMENT_METHODS}/${id}`);

export const togglePaymentMethod = (id: number | string) =>
  http.patch<PaymentMethod>(`${ENDPOINTS.PAYMENT_METHODS}/${id}/toggle`, {});
