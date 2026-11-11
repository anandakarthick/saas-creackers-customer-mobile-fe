import apiClient from './client';

/**
 * Publicly-accessible store info endpoint that returns the tenant's basic
 * info PLUS the active theme colors (themeRef). The mobile app uses this to
 * sync its UI colors with whatever the admin selected in the web dashboard.
 *
 * The endpoint itself is defined under /api/store/info and is tenant-scoped
 * via the `X-Tenant-Slug` header (already auto-injected by apiClient).
 */
export interface BackendThemeRef {
  id: number;
  name: string;
  slug: string;
  accentColor: string;
  accentLight: string;
  accentDark: string;
  actionFrom: string;
  actionTo: string;
  badgeBg: string;
  heroFrom: string;
  heroVia: string;
  heroTo: string;
}

export interface StoreInfoResponse {
  id: number;
  name: string;
  slug: string;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  theme?: string;
  themeRef?: BackendThemeRef | null;
  /** Tenant settings JSON — may contain `themeConfig` with the admin's
   *  chosen primaryColor / secondaryColor / sidebarColor / themeMode. */
  settings?: Record<string, any> | null;
  currency?: string;
  [key: string]: any;
}

export const getStoreInfo = async (): Promise<StoreInfoResponse> => {
  const res = await apiClient.get<{ success: boolean; data: StoreInfoResponse }>('/store/info');
  return res.data.data;
};

export interface ApplyCouponResult {
  valid: boolean;
  discount: number;
  code: string;
  discountType: string;
  discountValue: number;
  message?: string;
}

export interface AutoDiscountResult {
  discount: number;
  appliedOffers: { offerName: string; productName?: string; discount: number }[];
  updatedPrices?: { productId: number; price: number; comparePrice?: number; dealActive: boolean }[];
}

export const applyCoupon = async (
  code: string,
  subtotal: number,
  items?: { productId: number; quantity: number; price: number }[],
): Promise<ApplyCouponResult> => {
  const res = await apiClient.post<{ success: boolean; data: ApplyCouponResult }>(
    '/store/coupon/apply',
    { code, subtotal, items },
  );
  return res.data.data;
};

export const getAutoDiscount = async (
  items: { productId: number; quantity: number; price: number; categoryId?: number }[],
): Promise<AutoDiscountResult> => {
  const res = await apiClient.post<{ success: boolean; data: AutoDiscountResult }>(
    '/store/cart/auto-discount',
    { items },
  );
  return res.data.data;
};
