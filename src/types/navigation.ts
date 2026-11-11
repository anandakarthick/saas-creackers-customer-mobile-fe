import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { DrawerScreenProps } from '@react-navigation/drawer';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { ID } from './index';

// Auth Stack
export type AuthStackParamList = {
  Login: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token: string };
};

// Main Tab Navigator
export type MainTabParamList = {
  DashboardTab: undefined;
  OrdersTab: NavigatorScreenParams<OrdersStackParamList>;
  POSTab: NavigatorScreenParams<POSStackParamList>;
  InventoryTab: NavigatorScreenParams<InventoryStackParamList>;
  MoreTab: undefined;
};

// Drawer Navigator
export type DrawerParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  Orders: NavigatorScreenParams<OrdersStackParamList>;
  POS: NavigatorScreenParams<POSStackParamList>;
  Stock: NavigatorScreenParams<InventoryStackParamList>;
  Categories: NavigatorScreenParams<CategoriesStackParamList>;
  Products: NavigatorScreenParams<ProductsStackParamList>;
  Customers: NavigatorScreenParams<CustomersStackParamList>;
  Branches: NavigatorScreenParams<BranchesStackParamList>;
  Employees: NavigatorScreenParams<EmployeesStackParamList>;
  Roles: NavigatorScreenParams<RolesStackParamList>;
  Suppliers: NavigatorScreenParams<SuppliersStackParamList>;
  PurchaseOrders: NavigatorScreenParams<PurchaseOrdersStackParamList>;
  Estimates: NavigatorScreenParams<EstimatesStackParamList>;
  GRN: NavigatorScreenParams<GRNStackParamList>;
  StockAdjustments: NavigatorScreenParams<StockAdjustmentsStackParamList>;
  Banners: NavigatorScreenParams<BannersStackParamList>;
  Offers: NavigatorScreenParams<OffersStackParamList>;
  SocialMedia: NavigatorScreenParams<SocialMediaStackParamList>;
  Reports: NavigatorScreenParams<ReportsStackParamList>;
  Expenses: NavigatorScreenParams<ExpensesStackParamList>;
  SalesReturns: NavigatorScreenParams<SalesReturnsStackParamList>;
  PurchaseReturns: NavigatorScreenParams<PurchaseReturnsStackParamList>;
  CreditNotes: NavigatorScreenParams<CreditNotesStackParamList>;
  DebitNotes: NavigatorScreenParams<DebitNotesStackParamList>;
  Assets: NavigatorScreenParams<AssetsStackParamList>;
  Settings: NavigatorScreenParams<SettingsStackParamList>;
};

// Root Navigator
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<DrawerParamList>;
};

// Feature Stack Param Lists
export type OrdersStackParamList = {
  OrdersList: undefined;
  OrderDetail: { id: ID };
  OrderForm: { id?: ID };
};

export type POSStackParamList = {
  POSMain: { editEstimateId?: number } | undefined;
  POSDummyBill: { editEstimateId?: number } | undefined;
  POSCart: undefined;
  POSCheckout: undefined;
  POSSalesHistory: undefined;
  POSReceipt: { id: ID; offlineData?: any };
  POSBarcodeScanner: undefined;
};

export type InventoryStackParamList = {
  StockList: undefined;
  StockDetail: { id: ID };
  LowStock: undefined;
  StockValuation: undefined;
};

export type CategoriesStackParamList = {
  CategoriesList: undefined;
  CategoryDetail: { id: ID };
  CategoryForm: { id?: ID };
};

export type ProductsStackParamList = {
  ProductsList: undefined;
  ProductDetail: { id: ID };
  ProductForm: { id?: ID };
  BarcodePrintJobs: undefined;
  BulkUpdate: undefined;
};

export type CustomersStackParamList = {
  CustomersList: undefined;
  CustomerDetail: { id: ID };
  CustomerForm: { id?: ID };
};

export type BranchesStackParamList = {
  BranchesList: undefined;
  BranchDetail: { id: ID };
  BranchForm: { id?: ID };
};

export type EmployeesStackParamList = {
  EmployeesList: undefined;
  EmployeeDetail: { id: ID };
  EmployeeForm: { id?: ID };
};

export type RolesStackParamList = {
  RolesList: undefined;
  RoleDetail: { id: ID };
  RoleForm: { id?: ID };
  Permissions: undefined;
};

export type SuppliersStackParamList = {
  SuppliersList: undefined;
  SupplierDetail: { id: ID };
  SupplierForm: { id?: ID };
};

export type PurchaseOrdersStackParamList = {
  PurchaseOrdersList: undefined;
  PurchaseOrderDetail: { id: ID };
  PurchaseOrderForm: { id?: ID };
  EstimatesList: undefined;
  EstimateDetail: { id: ID };
  EstimateForm: { id?: ID };
};

/** Dedicated stack for the Estimates module (reachable from its own drawer entry). */
export type EstimatesStackParamList = {
  EstimatesList: undefined;
  EstimateDetail: { id: ID };
  EstimateForm: { id?: ID };
};

export type GRNStackParamList = {
  GRNList: undefined;
  GRNDetail: { id: ID };
  GRNForm: { purchaseOrderId?: ID };
};

export type StockAdjustmentsStackParamList = {
  StockAdjustmentsList: undefined;
  StockAdjustmentDetail: { id: ID };
  StockAdjustmentForm: { id?: ID };
};

export type BannersStackParamList = {
  BannersList: undefined;
  BannerDetail: { id: ID };
  BannerForm: { id?: ID };
};

export type OffersStackParamList = {
  OffersList: undefined;
  OfferDetail: { id: ID };
  OfferForm: { id?: ID };
};

export type SocialMediaStackParamList = {
  SocialMediaList: undefined;
  SocialMediaDetail: { id: ID };
  SocialMediaForm: { id?: ID };
};

export type ReportsStackParamList = {
  ReportsDashboard: undefined;
  CustomerReport: undefined;
  SalesReport: undefined;
  ProductReport: undefined;
  InventoryReport: undefined;
  PurchaseOrderReport: undefined;
  GRNReport: undefined;
  AdjustmentsReport: undefined;
  FinancialReport: undefined;
};

export type ExpensesStackParamList = {
  ExpensesList: undefined;
  ExpenseDetail: { id: ID };
  ExpenseForm: { id?: ID };
};

// Returns & notes
export type SalesReturnsStackParamList = {
  SalesReturnsList: undefined;
  SalesReturnDetail: { id: ID };
  SalesReturnForm: { orderId?: ID | number };
};
export type PurchaseReturnsStackParamList = {
  PurchaseReturnsList: undefined;
  PurchaseReturnDetail: { id: ID };
  PurchaseReturnForm: { purchaseOrderId?: ID | number };
};
export type CreditNotesStackParamList = {
  CreditNotesList: undefined;
  CreditNoteDetail: { id: ID };
  CreditNoteForm: { customerId?: ID };
};
export type DebitNotesStackParamList = {
  DebitNotesList: undefined;
  DebitNoteDetail: { id: ID };
  DebitNoteForm: { supplierId?: ID };
};

export type AssetsStackParamList = {
  AssetsList: undefined;
  AssetDetail: { id: ID };
  AssetForm: { id?: ID };
};

export type SettingsStackParamList = {
  SettingsMain: undefined;
  Profile: undefined;
  ProfileEdit: undefined;
  ChangePassword: undefined;
  StoreSettings: undefined;
  StoreConfig: undefined;
  ThemeAppearance: undefined;
  PaymentMethods: undefined;
  PaymentMethodForm: { id?: ID };
  Notifications: undefined;
  CsvImportExport: undefined;
  EmailSettings: undefined;
  DeliverySettings: undefined;
  PaginationSettings: undefined;
  NotificationSettings: undefined;
  BillFormatSettings: undefined;
  InvoiceNumbering: undefined;
  SocialLinks: undefined;
  WhatsAppConnection: undefined;
  WhatsAppTemplates: undefined;
};

// Screen Props Types
export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type AuthStackScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, T>,
    DrawerScreenProps<DrawerParamList>
  >;

export type DrawerScreenPropsType<T extends keyof DrawerParamList> =
  DrawerScreenProps<DrawerParamList, T>;

// Declare global navigation types
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
