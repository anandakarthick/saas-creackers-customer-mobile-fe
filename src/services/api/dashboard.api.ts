import { http } from './client';
import { ENDPOINTS } from '@/config/api';

export interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  totalProducts: number;
  recentOrders?: any[];
  topProducts?: any[];
  [key: string]: any;
}

export const getDashboardStats = (): Promise<DashboardStats> =>
  http.get<DashboardStats>(ENDPOINTS.DASHBOARD);
