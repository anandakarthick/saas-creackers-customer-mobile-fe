/**
 * API configuration for the mobile admin app.
 *
 * IMPORTANT: set `BASE_URL` to the backend you want to talk to.
 *
 * ── Local development ──────────────────────────────────────────
 *   Android emulator (AVD):     http://10.0.2.2:5000/api
 *   iOS simulator:              http://localhost:5000/api
 *   Physical device via USB:    http://<your-PC-LAN-IP>:5000/api
 *                               (e.g. http://192.168.1.5:5000/api — run `ipconfig` to find it)
 *                               You must also be on the same Wi-Fi network.
 *
 * ── Production ─────────────────────────────────────────────────
 *   Point to your deployed backend, e.g. https://api.kasoftware.in/api
 *
 * The mobile app talks to the existing web-admin endpoints (/api/admin/*),
 * so no new backend work is required. The admin endpoints identify the tenant
 * from the `X-Tenant-Slug` header that this client injects automatically
 * (see services/api/client.ts).
 */
export const API_CONFIG = {
  BASE_URL: 'https://vipagency.co.in/api',
  TIMEOUT: 30000,
  USE_MOCK: false,
};

export function setApiBaseUrl(url: string) {
  API_CONFIG.BASE_URL = url;
}

/**
 * Admin endpoints. All are mounted at `/api/admin/*` on the backend.
 * The tenant is resolved from the `X-Tenant-Slug` header + JWT on the server.
 */
export const ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: '/admin/auth/login',
    LOGOUT: '/admin/auth/logout',
    REFRESH: '/admin/auth/refresh',
    FORGOT_PASSWORD: '/admin/auth/forgot-password',
    RESET_PASSWORD: '/admin/auth/reset-password',
    ME: '/admin/auth/me',
  },

  // Dashboard
  DASHBOARD: '/admin/dashboard',

  // Catalog
  CATEGORIES: '/admin/categories',
  PRODUCTS: '/admin/products',
  PRODUCT_STATS: '/admin/products/stats',

  // Customers
  CUSTOMERS: '/admin/customers',
  CUSTOMER_STATS: '/admin/customers/stats',

  // Orders
  ORDERS: '/admin/orders',
  ORDER_STATS: '/admin/orders/stats',

  // Branches
  BRANCHES: '/admin/branches',
  BRANCH_STATS: '/admin/branches/stats',

  // Users / Employees / Roles / Permissions
  USERS: '/admin/users',
  ROLES: '/admin/roles',
  PERMISSIONS: '/admin/permissions',

  // Procurement
  SUPPLIERS: '/admin/suppliers',
  SUPPLIER_STATS: '/admin/suppliers/stats',
  PURCHASE_ORDERS: '/admin/purchase-orders',
  ESTIMATES: '/admin/estimates',

  // Inventory
  STOCK: '/admin/inventory/stock',
  GRN: '/admin/inventory/grn',
  STOCK_ADJUSTMENTS: '/admin/inventory/adjustments',
  LOW_STOCK: '/admin/inventory/low-stock',
  STOCK_VALUATION: '/admin/inventory/valuation',

  // Marketing
  BANNERS: '/admin/banners',
  OFFERS: '/admin/coupons',
  SOCIAL_LINKS: '/admin/social-links',

  // Expenses (tenant-level)
  EXPENSES: '/admin/expenses',
  EXPENSE_STATS: '/admin/expenses/stats',

  // Assets (fixed assets)
  ASSETS: '/admin/assets',
  ASSET_STATS: '/admin/assets/stats',

  // POS (backend mount point: /api/admin/pos/*)
  POS_PRODUCTS: '/admin/pos/products',
  POS_SALES: '/admin/pos/sales',
  POS_STATS: '/admin/pos/sales/stats',
  POS_NEXT_NUMBER: '/admin/pos/sales/next-number',
  POS_SCAN_SESSION: '/admin/pos/scan-session',

  // Reports
  REPORTS: {
    DASHBOARD: '/admin/reports/dashboard',
    SALES: '/admin/reports/sales',
    INVENTORY: '/admin/reports/inventory',
    CUSTOMERS: '/admin/reports/customers',
    PRODUCTS: '/admin/reports/products',
    PURCHASE_ORDERS: '/admin/reports/purchase-orders',
    GRN: '/admin/reports/grn',
    ADJUSTMENTS: '/admin/reports/adjustments',
    FINANCIAL: '/admin/reports/financial',
  },

  // Settings & Config
  SETTINGS: '/admin/settings',
  PROFILE: '/admin/profile',
  CHANGE_PASSWORD: '/admin/profile/change-password',
  UPLOAD_LOGO: '/admin/settings/logo',
  PAYMENT_METHODS: '/admin/payment-methods',
  NOTIFICATIONS: '/admin/notifications',

  // Image Library
  IMAGE_LIBRARY: '/admin/image-library',

  // CSV Import
  IMPORT: '/admin/import',

  // Barcode Print Jobs
  BARCODE_PRINT_JOBS: '/admin/products/barcode-print/jobs',

  // Permissions extras
  PERMISSION_CATALOG: '/admin/permissions/catalog',
  PERMISSION_UPSERT: '/admin/permissions/upsert',
  PERMISSION_GENERATE: '/admin/permissions/generate',

  // Returns & notes
  SALES_RETURNS: '/admin/sales-returns',
  PURCHASE_RETURNS: '/admin/purchase-returns',
  CREDIT_NOTES: '/admin/credit-notes',
  DEBIT_NOTES: '/admin/debit-notes',

  // Storefront (public endpoints — tenant resolved via X-Tenant-Slug header)
  STORE: {
    OFFERS: '/store/offers',
    DEAL_PRODUCTS: '/store/deal-products',
    APPLY_COUPON: '/store/coupon/apply',
    AUTO_DISCOUNT: '/store/cart/auto-discount',
  },
};
