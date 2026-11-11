import apiClient, { http } from './client';
import { ENDPOINTS } from '@/config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponseUser {
  id: number;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  tenantId?: number;
  branchId?: number | null;
  isSuperAdmin?: boolean;
  role?: any;
}

export interface LoginResponse {
  user: LoginResponseUser;
  accessToken: string;
  refreshToken: string;
}

/**
 * Log in with email/password.
 *
 * The backend identifies the tenant via the `identifyTenant` middleware, which
 * accepts the slug from multiple sources (priority order):
 *   1. X-Tenant-Slug header  ← we send this (via request interceptor)
 *   2. Request body `tenantSlug`  ← we also include this as a belt-and-suspenders fallback
 *   3. Subdomain (not applicable for mobile)
 */
export const login = async (payload: LoginRequest, tenantSlug: string): Promise<LoginResponse> => {
  // Persist the tenant slug first so the request interceptor picks it up.
  await AsyncStorage.setItem(STORAGE_KEYS.TENANT_SLUG, tenantSlug);
  const res = await apiClient.post<{ success: boolean; data: LoginResponse }>(
    ENDPOINTS.AUTH.LOGIN,
    { ...payload, tenantSlug }
  );
  return res.data.data;
};

export const logoutApi = async (): Promise<void> => {
  try {
    await http.post(ENDPOINTS.AUTH.LOGOUT);
  } catch {
    // Ignore — we still clear local state on the client
  }
};

export const forgotPassword = async (email: string): Promise<void> => {
  await http.post(ENDPOINTS.AUTH.FORGOT_PASSWORD, { email });
};

export const resetPassword = async (token: string, password: string): Promise<void> => {
  await http.post(ENDPOINTS.AUTH.RESET_PASSWORD, { token, password });
};

export const getMe = async (): Promise<LoginResponseUser> => {
  return http.get<LoginResponseUser>(ENDPOINTS.AUTH.ME);
};
