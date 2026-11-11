import apiClient from './client';
import { ENDPOINTS } from '@/config/api';

export interface DateRangeParams {
  from?: string;
  to?: string;
}

async function get<T = any>(url: string, params?: any): Promise<T> {
  const res = await apiClient.get<any>(url, { params });
  // Backend wraps everything in { success, data }. Dashboard endpoints also
  // sometimes return { success, data: {...} } — normalize to the payload.
  return (res.data?.data ?? res.data) as T;
}

// ── Reports Dashboard ─────────────────────────────────────
export const getReportDashboard = () => get<any>(ENDPOINTS.REPORTS.DASHBOARD);

// ── CSV Export ────────────────────────────────────────────
export const exportReportCsv = async (
  endpoint: string,
  params?: DateRangeParams & Record<string, any>,
): Promise<ArrayBuffer> => {
  const res = await apiClient.get<ArrayBuffer>(
    `/admin/reports/${endpoint}`,
    { params: { ...params, format: 'csv' }, responseType: 'arraybuffer' },
  );
  return res.data;
};

// ── Customer Report ───────────────────────────────────────
export interface CustomerReportRow {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  totalOrders: number;
  onlineSpent: number;
  posSpent: number;
  totalSpent: number;
  avgOrderValue: number;
  joinedDate: string;
}
export const getCustomerReport = (params?: DateRangeParams & { search?: string }) =>
  get<CustomerReportRow[]>(ENDPOINTS.REPORTS.CUSTOMERS, params);

// ── Sales Report ──────────────────────────────────────────
export interface SalesReportOrderRow {
  id: number;
  orderNumber: string;
  customer: string;
  phone: string;
  date: string;
  items: number;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  status: string;
  paymentStatus: string;
}
export interface SalesReportResponse {
  orders: SalesReportOrderRow[];
  summary: {
    totalOrders: number;
    totalRevenue: number;
    totalDiscount: number;
    avgOrderValue: number;
  };
}
export const getSalesReport = (params?: DateRangeParams & { status?: string; paymentMethod?: string }) =>
  get<SalesReportResponse>(ENDPOINTS.REPORTS.SALES, params);

// ── Product Performance ───────────────────────────────────
export interface ProductReportRow {
  id: number;
  name: string;
  sku: string;
  category: string;
  qtySold: number;
  revenue: number;
  avgPrice: number;
  costPrice: number;
  stock: number;
  status: string;
}
export const getProductReport = (params?: DateRangeParams & { categoryId?: number }) =>
  get<ProductReportRow[]>(ENDPOINTS.REPORTS.PRODUCTS, params);

// ── Inventory Report ──────────────────────────────────────
export interface InventoryReportProduct {
  id: number;
  name: string;
  sku: string;
  category: string;
  stock: number;
  lowStockAlert: number;
  costPrice: number;
  retailPrice: number;
  stockValue: number;
  status: string;
}
export interface InventoryReportResponse {
  products: InventoryReportProduct[];
  summary: {
    totalProducts: number;
    totalStock: number;
    totalValue: number;
    lowStock: number;
    outOfStock: number;
  };
}
export const getInventoryReport = () =>
  get<InventoryReportResponse>(ENDPOINTS.REPORTS.INVENTORY);

// ── Purchase Order Report ─────────────────────────────────
export interface PurchaseOrderReportRow {
  id: number;
  orderNumber: string;
  supplier: string;
  date: string;
  expectedDate: string | null;
  items: number;
  subtotal: number;
  tax: number;
  total: number;
  status: string;
}
export const getPurchaseOrderReport = (params?: DateRangeParams & { status?: string }) =>
  get<PurchaseOrderReportRow[]>(ENDPOINTS.REPORTS.PURCHASE_ORDERS, params);

// ── GRN Report ────────────────────────────────────────────
export interface InventoryLogRow {
  id: number;
  quantity: number;
  prevQty: number;
  newQty: number;
  reference: string | null;
  notes: string | null;
  createdAt: string;
  product: { name: string; sku: string };
}
export const getGrnReport = (params?: DateRangeParams) =>
  get<InventoryLogRow[]>(ENDPOINTS.REPORTS.GRN, params);

// ── Adjustments Report ────────────────────────────────────
export const getAdjustmentsReport = (params?: DateRangeParams) =>
  get<InventoryLogRow[]>(ENDPOINTS.REPORTS.ADJUSTMENTS, params);

// ── Financial Report ──────────────────────────────────────
export interface FinancialReportResponse {
  income: { posSales: number; onlineSales: number; total: number };
  expenses: { purchases: number; stockLoss: number; total: number };
  netProfitLoss: number;
  profitMargin: number;
}
export const getFinancialReport = (params?: DateRangeParams) =>
  get<FinancialReportResponse>(ENDPOINTS.REPORTS.FINANCIAL, params);
