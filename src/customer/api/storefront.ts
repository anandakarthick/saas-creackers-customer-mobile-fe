/** Typed storefront API calls + response types (fields match the backend /store/* routes). */
import { get, getList, post } from './client';

export interface StoreInfo {
  id: number;
  name: string;
  slug: string;
  logoUrl: string | null;
  currency?: string | null;
  announcement?: string | null;
  [k: string]: any;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  image?: string | null;
  [k: string]: any;
}

export interface ProductImage {
  id: number;
  url: string;
  isPrimary?: boolean;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  shortDesc: string | null;
  description: string | null;
  sku: string;
  price: number | string;
  comparePrice: number | string | null;
  quantity: number;
  status: 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK';
  isFeatured: boolean;
  images: ProductImage[];
  category?: { id: number; name: string; slug: string } | null;
  [k: string]: any;
}

export interface OrderInput {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  shippingAddress: {
    name?: string;
    phone?: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
  };
  items: { productId: number; quantity: number }[];
  paymentMethod?: string;
  couponCode?: string;
  notes?: string;
  paymentConfirmed?: boolean;
}

export const getStoreInfo = () => get<StoreInfo>('/store/info');
export const getCategories = () => get<Category[]>('/store/categories');
export const getFeaturedProducts = () => get<Product[]>('/store/products/featured');
export const getProductBySlug = (slug: string) => get<Product>(`/store/products/${slug}`);
export const getBanners = () => get<any[]>('/store/banners');
export const getOffers = () => get<any[]>('/store/offers');
export const getDealProducts = () => get<any[]>('/store/deal-products');

export const getProducts = (params?: {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  sort?: string;
}) => getList<Product>('/store/products', params);

export const placeOrder = (input: OrderInput) => post<any>('/store/orders', input);

export const trackOrder = (phone: string, orderNumber?: string) =>
  get<any>('/store/orders/track', orderNumber ? { phone, orderNumber } : { phone });

export const getPaymentMethods = () => get<any[]>('/store/payment-methods');

// Online payment (redirect gateway flow, same as the web storefront)
export const initiatePayment = (data: {
  orderId: number;
  paymentMethodId: number;
  returnUrl: string;
}) => post<{ redirectUrl: string; gatewayOrderId: string }>('/store/payments/initiate', data);

export const verifyPayment = (params: Record<string, string>) =>
  get<{ success: boolean; order: any }>('/store/payments/verify', params);
