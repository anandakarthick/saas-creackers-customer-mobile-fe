import type { Role, Permission } from '@/types';
import { MODULES, ACTIONS } from '@/constants';

// Helper to create permissions
const createPermission = (module: string, action: string): Permission => ({
  id: `perm-${module}-${action}`,
  name: `${action.charAt(0).toUpperCase() + action.slice(1)} ${module.replace(/_/g, ' ')}`,
  module,
  action: action as 'create' | 'read' | 'update' | 'delete',
});

// All permissions for super admin
const allPermissions: Permission[] = Object.values(MODULES).flatMap((module) =>
  Object.values(ACTIONS).map((action) => createPermission(module, action))
);

// Manager permissions
const managerPermissions: Permission[] = [
  ...Object.values(ACTIONS).map((action) => createPermission(MODULES.DASHBOARD, action)),
  ...Object.values(ACTIONS).map((action) => createPermission(MODULES.PRODUCTS, action)),
  ...Object.values(ACTIONS).map((action) => createPermission(MODULES.CATEGORIES, action)),
  ...Object.values(ACTIONS).map((action) => createPermission(MODULES.ORDERS, action)),
  ...Object.values(ACTIONS).map((action) => createPermission(MODULES.CUSTOMERS, action)),
  ...Object.values(ACTIONS).map((action) => createPermission(MODULES.INVENTORY, action)),
  ...Object.values(ACTIONS).map((action) => createPermission(MODULES.GRN, action)),
  ...Object.values(ACTIONS).map((action) => createPermission(MODULES.POS, action)),
  createPermission(MODULES.EMPLOYEES, ACTIONS.READ),
  createPermission(MODULES.REPORTS, ACTIONS.READ),
];

// Salesperson permissions
const salespersonPermissions: Permission[] = [
  createPermission(MODULES.DASHBOARD, ACTIONS.READ),
  createPermission(MODULES.PRODUCTS, ACTIONS.READ),
  createPermission(MODULES.CATEGORIES, ACTIONS.READ),
  ...Object.values(ACTIONS).map((action) => createPermission(MODULES.ORDERS, action)),
  ...Object.values(ACTIONS).map((action) => createPermission(MODULES.CUSTOMERS, action)),
  ...Object.values(ACTIONS).map((action) => createPermission(MODULES.POS, action)),
  createPermission(MODULES.INVENTORY, ACTIONS.READ),
];

// Accountant permissions
const accountantPermissions: Permission[] = [
  createPermission(MODULES.DASHBOARD, ACTIONS.READ),
  createPermission(MODULES.ORDERS, ACTIONS.READ),
  createPermission(MODULES.CUSTOMERS, ACTIONS.READ),
  ...Object.values(ACTIONS).map((action) => createPermission(MODULES.REPORTS, action)),
  createPermission(MODULES.PURCHASE_ORDERS, ACTIONS.READ),
  createPermission(MODULES.SUPPLIERS, ACTIONS.READ),
];

// Warehouse permissions
const warehousePermissions: Permission[] = [
  createPermission(MODULES.DASHBOARD, ACTIONS.READ),
  createPermission(MODULES.PRODUCTS, ACTIONS.READ),
  ...Object.values(ACTIONS).map((action) => createPermission(MODULES.INVENTORY, action)),
  ...Object.values(ACTIONS).map((action) => createPermission(MODULES.GRN, action)),
  ...Object.values(ACTIONS).map((action) => createPermission(MODULES.STOCK_ADJUSTMENTS, action)),
  createPermission(MODULES.PURCHASE_ORDERS, ACTIONS.READ),
];

export const mockRoles: Role[] = [
  {
    id: 'role-1',
    name: 'Super Admin',
    permissions: allPermissions,
  },
  {
    id: 'role-2',
    name: 'Branch Manager',
    permissions: managerPermissions,
  },
  {
    id: 'role-3',
    name: 'Salesperson',
    permissions: salespersonPermissions,
  },
  {
    id: 'role-4',
    name: 'Accountant',
    permissions: accountantPermissions,
  },
  {
    id: 'role-5',
    name: 'Warehouse Staff',
    permissions: warehousePermissions,
  },
];

export const mockPermissions = allPermissions;
