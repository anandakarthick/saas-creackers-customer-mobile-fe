import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, ENDPOINTS, setApiBaseUrl } from '@/config/api';
import { STORAGE_KEYS } from '@/constants';
import { useAuthStore } from '@/store';
import { APP_CONFIG } from '@/config/app';
import { loadTenantConfig } from '@/utils/tenantConfig';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

export async function initApiClient() {
  const config = await loadTenantConfig();
  if (config?.apiBaseUrl) {
    setApiBaseUrl(config.apiBaseUrl);
    apiClient.defaults.baseURL = config.apiBaseUrl;
  }
}

// Request interceptor — attach bearer token + x-tenant-slug header
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (config.headers) {
      const [token, tenantSlug] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN),
        AsyncStorage.getItem(STORAGE_KEYS.TENANT_SLUG),
      ]);

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      // Backend's identifyTenant middleware resolves the tenant from this header
      // (since mobile has no subdomain context).
      // Fall back to APP_CONFIG.tenantSlug (baked into the build) so pre-auth
      // API calls (like /store/info) always have a valid slug even if
      // AsyncStorage hasn't been populated yet.
      const slug = tenantSlug || APP_CONFIG.tenantSlug;
      if (slug) {
        config.headers['X-Tenant-Slug'] = slug;
      }
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Mutex for token refresh — prevents parallel 401s from racing
let refreshPromise: Promise<string> | null = null;

// Response interceptor — auto-refresh on 401, then retry
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        if (!refreshPromise) {
          refreshPromise = (async () => {
            const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
            const tenantSlug = await AsyncStorage.getItem(STORAGE_KEYS.TENANT_SLUG);

            if (!refreshToken) throw new Error('No refresh token');

            const response = await axios.post(
              `${API_CONFIG.BASE_URL}${ENDPOINTS.AUTH.REFRESH}`,
              { refreshToken },
              {
                headers: tenantSlug ? { 'X-Tenant-Slug': tenantSlug } : {},
              }
            );

            const data = response.data?.data ?? response.data;
            const newToken: string = data.accessToken || data.token;
            if (!newToken) throw new Error('Refresh response missing access token');
            const newRefreshToken: string = data.refreshToken || refreshToken;

            await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, newToken);
            await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);

            return newToken;
          })().finally(() => { refreshPromise = null; });
        }

        const newToken = await refreshPromise;
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        return apiClient(originalRequest);
      } catch {
        // Only logout if the auth store has finished hydrating from
        // AsyncStorage. During cold-start the store is still loading —
        // calling logout() here would wipe the persisted session before
        // it has been restored, causing a crash on reopen.
        if (useAuthStore.getState()._hasHydrated) {
          useAuthStore.getState().logout();
          await Promise.all([
            AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN),
            AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN),
            AsyncStorage.removeItem(STORAGE_KEYS.USER),
          ]);
        }
      }
    }

    return Promise.reject(new Error(getErrorMessage(error)));
  }
);

function getErrorMessage(error: AxiosError): string {
  if (error.response) {
    const data = error.response.data as { message?: string; error?: string; errors?: Record<string, string[]> };
    let msg = data.message || data.error || 'An error occurred';
    if (data.errors && typeof data.errors === 'object') {
      const details = Object.entries(data.errors)
        .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
        .join('\n');
      if (details) msg += '\n' + details;
    }
    return msg;
  } else if (error.request) {
    return 'No response from server. Please check your connection.';
  }
  return error.message || 'An unexpected error occurred';
}

export default apiClient;

/**
 * All backend responses follow: { success, data, message, errors? }
 * This helper unwraps `data` so callers get the payload directly.
 */
type Envelope<T> = { success: boolean; data: T; message?: string };

async function unwrap<T>(promise: Promise<{ data: Envelope<T> }>): Promise<T> {
  const res = await promise;
  return res?.data?.data as T;
}

/** Typed HTTP helpers — auto-unwrap the `{ success, data }` envelope */
export const http = {
  get: <T>(url: string, params?: object) =>
    unwrap<T>(apiClient.get(url, { params })),

  post: <T>(url: string, data?: object) =>
    unwrap<T>(apiClient.post(url, data)),

  put: <T>(url: string, data?: object) =>
    unwrap<T>(apiClient.put(url, data)),

  patch: <T>(url: string, data?: object) =>
    unwrap<T>(apiClient.patch(url, data)),

  delete: <T>(url: string) =>
    unwrap<T>(apiClient.delete(url)),

  /** For endpoints that return the full envelope (e.g. paginated lists) */
  getRaw: <T>(url: string, params?: object) =>
    apiClient.get<T>(url, { params }).then((r) => r.data),

  postRaw: <T>(url: string, data?: object) =>
    apiClient.post<T>(url, data).then((r) => r.data),
};
