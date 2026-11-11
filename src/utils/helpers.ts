import type { OrderStatus, PaymentStatus, PurchaseOrderStatus } from '@/types';
import { colors } from '@/theme/colors';

// Generate unique ID
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Deep clone object
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

// Debounce function
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => func(...args), wait);
  };
};

// Throttle function
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Get order status color
export const getOrderStatusColor = (status: OrderStatus): string => {
  const statusColors: Record<OrderStatus, string> = {
    pending: colors.status.pending,
    processing: colors.status.processing,
    shipped: colors.status.shipped,
    delivered: colors.status.delivered,
    cancelled: colors.status.cancelled,
    refunded: colors.status.refunded,
  };
  return statusColors[status] || colors.neutral[500];
};

// Get payment status color
export const getPaymentStatusColor = (status: PaymentStatus): string => {
  const statusColors: Record<PaymentStatus, string> = {
    pending: colors.warning.main,
    paid: colors.success.main,
    failed: colors.error.main,
    refunded: colors.neutral[500],
  };
  return statusColors[status] || colors.neutral[500];
};

// Get purchase order status color
export const getPOStatusColor = (status: PurchaseOrderStatus): string => {
  const statusColors: Record<PurchaseOrderStatus, string> = {
    draft: colors.neutral[400],
    pending: colors.warning.main,
    approved: colors.info.main,
    ordered: colors.primary.main,
    partially_received: colors.secondary.main,
    received: colors.success.main,
    cancelled: colors.error.main,
  };
  return statusColors[status] || colors.neutral[500];
};

// Get stock status
export const getStockStatus = (
  currentStock: number,
  minStock: number
): 'in_stock' | 'low_stock' | 'out_of_stock' => {
  if (currentStock <= 0) return 'out_of_stock';
  if (currentStock <= minStock) return 'low_stock';
  return 'in_stock';
};

// Get stock status color
export const getStockStatusColor = (
  currentStock: number,
  minStock: number
): string => {
  const status = getStockStatus(currentStock, minStock);
  return colors.stock[
    status === 'in_stock'
      ? 'inStock'
      : status === 'low_stock'
      ? 'lowStock'
      : 'outOfStock'
  ];
};

// Filter empty values from object
export const filterEmpty = <T extends Record<string, any>>(obj: T): Partial<T> => {
  return Object.fromEntries(
    Object.entries(obj).filter(
      ([, value]) => value !== null && value !== undefined && value !== ''
    )
  ) as Partial<T>;
};

// Group array by key
export const groupBy = <T>(array: T[], key: keyof T): Record<string, T[]> => {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {} as Record<string, T[]>);
};

// Sort array by key
export const sortBy = <T>(
  array: T[],
  key: keyof T,
  order: 'asc' | 'desc' = 'asc'
): T[] => {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];

    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
};

// Search in array
export const searchInArray = <T extends Record<string, any>>(
  array: T[],
  query: string,
  keys: (keyof T)[]
): T[] => {
  const lowercaseQuery = query.toLowerCase();
  return array.filter((item) =>
    keys.some((key) =>
      String(item[key]).toLowerCase().includes(lowercaseQuery)
    )
  );
};

// Calculate percentage change
export const calculatePercentageChange = (
  current: number,
  previous: number
): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

// Format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

// Check if object is empty
export const isEmpty = (obj: Record<string, any>): boolean => {
  return Object.keys(obj).length === 0;
};

// Safe JSON parse
export const safeJsonParse = <T>(str: string, fallback: T): T => {
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
};

// Delay/Sleep
export const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// Random color generator
export const getRandomColor = (): string => {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 50%)`;
};

// Check permission
export const hasPermission = (
  userPermissions: { module: string; action: string }[],
  module: string,
  action: string
): boolean => {
  return userPermissions.some(
    (p) => p.module === module && p.action === action
  );
};
