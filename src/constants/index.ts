export const STORAGE_KEYS = {
  AUTH_TOKEN: '@pyropark/auth_token',
  REFRESH_TOKEN: '@pyropark/refresh_token',
  USER: '@pyropark/user',
  THEME: '@pyropark/theme',
  LANGUAGE: '@pyropark/language',
  ONBOARDING_COMPLETE: '@pyropark/onboarding_complete',
  CART: '@pyropark/cart',
  RECENT_SEARCHES: '@pyropark/recent_searches',
  SALES_HISTORY: '@pyropark/sales_history',
  DRAFT_ORDERS: '@pyropark/draft_orders',
  TENANT_SLUG: '@pyropark/tenant_slug',
};

export const ORDER_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
} as const;

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  paid: 'Paid',
  failed: 'Failed',
  refunded: 'Refunded',
};

export const PAYMENT_METHODS = {
  CASH: 'cash',
  CARD: 'card',
  UPI: 'upi',
  NETBANKING: 'netbanking',
  CREDIT: 'credit',
} as const;

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  upi: 'UPI',
  netbanking: 'Net Banking',
  credit: 'Credit',
};

export const PURCHASE_ORDER_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  ORDERED: 'ordered',
  PARTIALLY_RECEIVED: 'partially_received',
  RECEIVED: 'received',
  CANCELLED: 'cancelled',
} as const;

export const PURCHASE_ORDER_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending: 'Pending',
  approved: 'Approved',
  ordered: 'Ordered',
  partially_received: 'Partially Received',
  received: 'Received',
  cancelled: 'Cancelled',
};

export const STOCK_MOVEMENT_TYPES = {
  IN: 'in',
  OUT: 'out',
  ADJUSTMENT: 'adjustment',
  TRANSFER: 'transfer',
} as const;

export const STOCK_MOVEMENT_LABELS: Record<string, string> = {
  in: 'Stock In',
  out: 'Stock Out',
  adjustment: 'Adjustment',
  transfer: 'Transfer',
};

export const BANNER_POSITIONS = {
  HOME: 'home',
  CATEGORY: 'category',
  PRODUCT: 'product',
} as const;

export const BANNER_POSITION_LABELS: Record<string, string> = {
  home: 'Home Page',
  category: 'Category Page',
  product: 'Product Page',
};

export const DISCOUNT_TYPES = {
  PERCENTAGE: 'percentage',
  FIXED: 'fixed',
} as const;

export const SOCIAL_PLATFORMS = {
  FACEBOOK: 'facebook',
  INSTAGRAM: 'instagram',
  TWITTER: 'twitter',
} as const;

export const POST_STATUS = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  PUBLISHED: 'published',
} as const;

export const ADJUSTMENT_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

// Module Permissions
export const MODULES = {
  DASHBOARD: 'dashboard',
  CATEGORIES: 'categories',
  PRODUCTS: 'products',
  ORDERS: 'orders',
  CUSTOMERS: 'customers',
  BRANCHES: 'branches',
  EMPLOYEES: 'employees',
  ROLES: 'roles',
  SUPPLIERS: 'suppliers',
  PURCHASE_ORDERS: 'purchase_orders',
  INVENTORY: 'inventory',
  GRN: 'grn',
  STOCK_ADJUSTMENTS: 'stock_adjustments',
  POS: 'pos',
  BANNERS: 'banners',
  OFFERS: 'offers',
  SOCIAL_MEDIA: 'social_media',
  REPORTS: 'reports',
  SETTINGS: 'settings',
} as const;

export const ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
} as const;
