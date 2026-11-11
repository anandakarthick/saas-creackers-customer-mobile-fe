// Common Types
export type ID = string;

// User & Auth Types
export interface User {
  id: ID;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  role: Role;
  branchId?: ID;
  /** The tenant this user belongs to — needed for Socket.IO room joining */
  tenantId?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: ID;
  name: string;
  permissions: Permission[];
}

export interface Permission {
  id: ID;
  name: string;
  module: string;
  action: 'create' | 'read' | 'update' | 'delete';
}

// Category Types
export interface Category {
  id: ID;
  name: string;
  description?: string;
  image?: string;
  parentId?: ID;
  isActive: boolean;
  productCount: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// Product Types
export interface Product {
  id: ID;
  name: string;
  sku: string;
  barcode?: string;
  description?: string;
  categoryId: ID;
  category?: Category;
  price: number;
  costPrice: number;
  unit: string;
  stock: number;
  minStock: number;
  maxStock?: number;
  images: string[];
  isActive: boolean;
  isFeatured: boolean;
  taxRate: number;
  hsn?: string;
  weight?: number;
  safetyInfo?: string;
  createdAt: string;
  updatedAt: string;
}

// Customer Types
export interface Customer {
  id: ID;
  name: string;
  email?: string;
  phone: string;
  address?: Address;
  gstNumber?: string;
  totalOrders: number;
  totalSpent: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

// Order Types
export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type PaymentMethod = 'cash' | 'card' | 'upi' | 'netbanking' | 'credit';

export interface Order {
  id: ID;
  orderNumber: string;
  customerId: ID;
  customer?: Customer;
  branchId: ID;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  notes?: string;
  shippingAddress?: Address;
  createdBy: ID;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: ID;
  productId: ID;
  product?: Product;
  quantity: number;
  price: number;
  discount: number;
  tax: number;
  total: number;
}

// Branch Types
export interface Branch {
  id: ID;
  name: string;
  code: string;
  address: Address;
  phone: string;
  email?: string;
  managerId?: ID;
  isActive: boolean;
  isMainBranch: boolean;
  createdAt: string;
  updatedAt: string;
}

// Supplier Types
export interface Supplier {
  id: ID;
  name: string;
  contactPerson: string;
  email?: string;
  phone: string;
  address: Address;
  gstNumber?: string;
  paymentTerms?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Purchase Order Types
export type PurchaseOrderStatus = 'draft' | 'pending' | 'approved' | 'ordered' | 'partially_received' | 'received' | 'cancelled';

export interface PurchaseOrder {
  id: ID;
  poNumber: string;
  supplierId: ID;
  supplier?: Supplier;
  branchId: ID;
  items: PurchaseOrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: PurchaseOrderStatus;
  expectedDate?: string;
  notes?: string;
  createdBy: ID;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderItem {
  id: ID;
  productId: ID;
  product?: Product;
  quantity: number;
  receivedQuantity: number;
  price: number;
  tax: number;
  total: number;
}

// Inventory Types
export interface StockMovement {
  id: ID;
  productId: ID;
  product?: Product;
  branchId: ID;
  type: 'in' | 'out' | 'adjustment' | 'transfer';
  quantity: number;
  previousStock: number;
  newStock: number;
  reference?: string;
  referenceType?: 'grn' | 'sale' | 'adjustment' | 'transfer';
  notes?: string;
  createdBy: ID;
  createdAt: string;
}

export interface GRN {
  id: ID;
  grnNumber: string;
  purchaseOrderId: ID;
  purchaseOrder?: PurchaseOrder;
  branchId: ID;
  items: GRNItem[];
  receivedBy: ID;
  notes?: string;
  createdAt: string;
}

export interface GRNItem {
  id: ID;
  productId: ID;
  product?: Product;
  orderedQuantity: number;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  rejectionReason?: string;
}

export interface StockAdjustment {
  id: ID;
  adjustmentNumber: string;
  branchId: ID;
  items: StockAdjustmentItem[];
  reason: string;
  notes?: string;
  adjustedBy: ID;
  approvedBy?: ID;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface StockAdjustmentItem {
  id: ID;
  productId: ID;
  product?: Product;
  currentStock: number;
  adjustedStock: number;
  difference: number;
}

// Employee Types
export interface Employee {
  id: ID;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  address?: Address;
  roleId: ID;
  role?: Role;
  branchId: ID;
  branch?: Branch;
  joiningDate: string;
  salary?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Marketing Types
export interface Banner {
  id: ID;
  title: string;
  image: string;
  link?: string;
  position: 'home' | 'category' | 'product';
  sortOrder: number;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Offer {
  id: ID;
  title: string;
  description: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderValue?: number;
  maxDiscount?: number;
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
  startDate: string;
  endDate: string;
  applicableTo: 'all' | 'category' | 'product';
  applicableIds?: ID[];
  createdAt: string;
  updatedAt: string;
}

export interface SocialMediaPost {
  id: ID;
  title: string;
  content: string;
  images: string[];
  platforms: ('facebook' | 'instagram' | 'twitter')[];
  status: 'draft' | 'scheduled' | 'published';
  scheduledAt?: string;
  publishedAt?: string;
  createdBy: ID;
  createdAt: string;
  updatedAt: string;
}

// POS Types
export interface POSCart {
  items: POSCartItem[];
  customerId?: ID;
  customer?: Customer;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
}

export interface POSCartItem {
  productId: ID;
  product: Product;
  quantity: number;
  price: number;
  discount: number;
  tax: number;
  total: number;
}

export interface POSSale {
  id: ID;
  receiptNumber: string;
  items: POSCartItem[];
  customerId?: ID;
  customerName?: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  status: 'completed' | 'draft' | 'cancelled';
  notes?: string;
  createdAt: string;
}

// Report Types
export interface SalesReport {
  totalSales: number;
  totalOrders: number;
  avgOrderValue: number;
  topProducts: { product: Product; quantity: number; revenue: number }[];
  salesByCategory: { category: Category; revenue: number }[];
  salesByDate: { date: string; revenue: number }[];
}

export interface InventoryReport {
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalValue: number;
  productsByCategory: { category: Category; count: number; value: number }[];
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Notification Types
export type NotificationType = 'order' | 'stock' | 'system' | 'promotion' | 'payment';

export interface Notification {
  id: ID;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  data?: {
    orderId?: ID;
    productId?: ID;
    customerId?: ID;
  };
  createdAt: string;
}

// Expense Types
export type ExpenseCategory =
  | 'RENT'
  | 'UTILITIES'
  | 'SALARY'
  | 'MARKETING'
  | 'LOGISTICS'
  | 'SUPPLIES'
  | 'TRAVEL'
  | 'MAINTENANCE'
  | 'PROFESSIONAL_FEES'
  | 'TAX'
  | 'MISC';

export type ExpensePaymentStatus = 'PAID' | 'PARTIAL' | 'PENDING';

export interface Expense {
  id: number;
  tenantId: number;
  branchId: number | null;
  expenseNumber: string | null;
  category: ExpenseCategory;
  description: string;
  amount: number | string;
  taxAmount: number | string;
  totalAmount: number | string;
  paymentMethod: string | null;
  paymentStatus: ExpensePaymentStatus;
  paidAmount: number | string;
  supplierId: number | null;
  supplierName: string | null;
  supplierPhone: string | null;
  supplierEmail: string | null;
  vendorName: string | null;
  vendorPhone: string | null;
  vendorEmail: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  dueDate: string | null;
  paidAt: string | null;
  date: string;
  reference: string | null;
  attachmentUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseStats {
  totalCount: number;
  totalAmount: number;
  paidAmount: number;
  outstanding: number;
  byCategory: Array<{ category: string; count: number; total: number }>;
  monthly: Array<{ month: string; total: number }>;
  overdue: { count: number; total: number };
}

// Asset Types
export type DepreciationMethod = 'STRAIGHT_LINE' | 'REDUCING_BALANCE' | 'NONE';
export type AssetStatus = 'ACTIVE' | 'UNDER_MAINTENANCE' | 'DISPOSED' | 'SOLD' | 'LOST';

export interface Asset {
  id: number;
  tenantId: number;
  branchId: number | null;
  assetTag: string;
  name: string;
  category: string;
  description: string | null;
  serialNumber: string | null;
  purchaseDate: string;
  purchasePrice: number | string;
  currentValue: number | string;
  salvageValue: number | string;
  depreciationMethod: DepreciationMethod;
  depreciationRate: number | string;
  usefulLifeYears: number | null;
  location: string | null;
  status: AssetStatus;
  supplierId: number | null;
  supplierName: string | null;
  supplierPhone: string | null;
  supplierEmail: string | null;
  vendorName: string | null;
  warrantyExpiresAt: string | null;
  disposedAt: string | null;
  disposalValue: number | string | null;
  attachmentUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  depreciation?: {
    annualDepreciation: number;
    accumulatedDepreciation: number;
    writtenDownValue: number;
  };
}

export interface AssetStats {
  totalAssets: number;
  totalPurchaseValue: number;
  totalCurrentValue: number;
  byCategory: Array<{ category: string; count: number; total: number }>;
  byStatus: Array<{ status: string; count: number }>;
  warrantyExpiringSoon: number;
}

// Admin Settings Types
export interface AdminSettings {
  storeName: string;
  logo: string | null;
  favicon: string | null;
  currency: string;
  timezone: string;
  language: string;
  gstNumber: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  phone: string | null;
  mobile: string | null;
  alternatePhone: string | null;
  gpayNumber: string | null;
  email: string | null;
  announcement: string | null;
  privacyPolicy: string | null;
  refundPolicy: string | null;
  termsOfService: string | null;
}

// Profile Types
export interface Profile {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
}

// Image Library Types
export interface LibraryImage {
  url: string;
  alt: string | null;
  source: 'PRODUCT' | 'CATEGORY';
  sourceId: number;
  sourceName: string;
  tenantId: number;
  createdAt: string;
}

// CSV Import Types
export type ImportModule = 'products' | 'categories' | 'customers' | 'suppliers' | 'branches';

export interface ImportResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
}

// Barcode Print Job Types
export interface BarcodePrintJob {
  id: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  productCount: number;
  fileUrl: string | null;
  createdAt: string;
}

// Product Movement Types
export interface ProductMovementLog {
  id: number;
  type: string;
  quantity: number;
  direction: 'IN' | 'OUT';
  prevQty: number;
  newQty: number;
  reference: string | null;
  notes: string | null;
  createdAt: string;
  branch?: { id: number; name: string } | null;
  user?: { id: number; name: string } | null;
}

export interface ProductMovementsResponse {
  logs: ProductMovementLog[];
  summary: Array<{
    type: string;
    label: string;
    qtyIn: number;
    qtyOut: number;
    net: number;
    count: number;
  }>;
  totals: { totalIn: number; totalOut: number; net: number; movementCount: number };
  sales: {
    online: { qtyIn: number; qtyOut: number; count: number };
    pos: { qtyIn: number; qtyOut: number; count: number };
  };
}

// Scan Session Types
export interface ScanSession {
  token: string;
  scanUrl: string;
}

// Form Types
export interface LoginForm {
  email: string;
  password: string;
}

export interface ForgotPasswordForm {
  email: string;
}

export interface ProductForm {
  name: string;
  sku: string;
  description?: string;
  categoryId: ID;
  price: number;
  costPrice: number;
  unit: string;
  stock: number;
  minStock: number;
  maxStock?: number;
  images: string[];
  isActive: boolean;
  isFeatured: boolean;
  taxRate: number;
  hsn?: string;
  weight?: number;
  safetyInfo?: string;
}
