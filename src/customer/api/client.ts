/**
 * Storefront API client for the customer app.
 *
 * Public endpoints (no login). The tenant (which shop) is sent in the
 * `x-tenant-slug` header, resolved from the injected tenant-config.json —
 * same mechanism as the staff app. The base URL is the tenant's API origin.
 */
import axios, { AxiosInstance } from 'axios';
import { loadTenantConfig } from '../../utils/tenantConfig';

// Used only for a bare local/test build with no injected tenant-config.
// Production APKs always carry tenant-config.json, so these are never used
// by a real customer. Set them to a known store to test locally.
const FALLBACK_BASE = 'https://kppcrackers.com/api';
const FALLBACK_SLUG = '';

let baseURL = FALLBACK_BASE;
let tenantSlug: string | null = FALLBACK_SLUG || null;

export const api: AxiosInstance = axios.create({
  timeout: 30000,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
});

/** Call once at app start — loads the tenant config and points the client at it. */
export async function initStoreApi(): Promise<void> {
  try {
    const cfg = await loadTenantConfig();
    if (cfg?.apiBaseUrl) {
      baseURL = cfg.apiBaseUrl;
    } else if (cfg?.domain) {
      const d = cfg.domain.startsWith('http') ? cfg.domain : `https://${cfg.domain}`;
      baseURL = `${d}/api`;
    }
    if (cfg?.slug) tenantSlug = cfg.slug;
  } catch {
    // keep fallbacks
  }
  api.defaults.baseURL = baseURL;
}

api.interceptors.request.use((config) => {
  config.baseURL = baseURL;
  if (tenantSlug) {
    config.headers = config.headers || {};
    (config.headers as any)['x-tenant-slug'] = tenantSlug;
  }
  return config;
});

/** The storefront web origin (API base without the trailing /api) — used for payment return URLs. */
export function storeOrigin(): string {
  return baseURL.replace(/\/api\/?$/i, '');
}

/** Turn a relative upload path (/uploads/..) into a full URL the phone can load. */
export function assetUrl(u?: string | null): string | undefined {
  if (!u) return undefined;
  if (/^https?:\/\//i.test(u)) return u;
  const origin = baseURL.replace(/\/api\/?$/i, '');
  return origin + (u.startsWith('/') ? u : `/${u}`);
}

// Backend envelope: { success, data, message, pagination? }
export async function get<T>(url: string, params?: object): Promise<T> {
  const r = await api.get(url, { params });
  return (r.data?.data ?? r.data) as T;
}

export async function getList<T>(
  url: string,
  params?: object,
): Promise<{ data: T[]; pagination?: any }> {
  const r = await api.get(url, { params });
  return { data: (r.data?.data ?? []) as T[], pagination: r.data?.pagination };
}

export async function post<T>(url: string, body?: object): Promise<T> {
  const r = await api.post(url, body);
  return (r.data?.data ?? r.data) as T;
}
