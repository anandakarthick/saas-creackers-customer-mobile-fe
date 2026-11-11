import { z } from 'zod';

// Common Regex Patterns
export const PATTERNS = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone: /^(\+91[\-\s]?)?[0]?(91)?[6789]\d{9}$/,
  pincode: /^[1-9][0-9]{5}$/,
  gst: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
  pan: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  sku: /^[A-Z0-9\-]{4,20}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
};

// Zod Schemas for Forms
export const loginSchema = z.object({
  tenantSlug: z.string().optional().default(''),
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(PATTERNS.password, 'Password must contain uppercase, lowercase, and number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const categorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  image: z.string().url('Invalid image URL').optional().or(z.literal('')),
  isActive: z.boolean().default(true),
  sortOrder: z.number().min(0).default(0),
});

export const productSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  sku: z.string().regex(PATTERNS.sku, 'Invalid SKU format'),
  description: z.string().optional(),
  categoryId: z.string().min(1, 'Category is required'),
  price: z.number().min(0, 'Price must be positive'),
  costPrice: z.number().min(0, 'Cost price must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  stock: z.number().min(0, 'Stock must be positive'),
  minStock: z.number().min(0, 'Min stock must be positive'),
  maxStock: z.number().min(0).optional(),
  images: z.array(z.string().url()).default([]),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  taxRate: z.number().min(0).max(100).default(18),
  hsn: z.string().optional(),
  weight: z.number().min(0).optional(),
  safetyInfo: z.string().optional(),
});

export const customerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().regex(PATTERNS.phone, 'Invalid phone number'),
  address: z.object({
    line1: z.string().min(1, 'Address is required'),
    line2: z.string().optional(),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    pincode: z.string().regex(PATTERNS.pincode, 'Invalid pincode'),
    country: z.string().default('India'),
  }).optional(),
  gstNumber: z.string().regex(PATTERNS.gst, 'Invalid GST number').optional().or(z.literal('')),
  isActive: z.boolean().default(true),
});

export const branchSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  code: z.string().min(2, 'Code must be at least 2 characters'),
  phone: z.string().regex(PATTERNS.phone, 'Invalid phone number'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.object({
    line1: z.string().min(1, 'Address is required'),
    line2: z.string().optional(),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    pincode: z.string().regex(PATTERNS.pincode, 'Invalid pincode'),
    country: z.string().default('India'),
  }),
  managerId: z.string().optional(),
  isActive: z.boolean().default(true),
  isMainBranch: z.boolean().default(false),
});

export const employeeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  phone: z.string().regex(PATTERNS.phone, 'Invalid phone number'),
  roleId: z.string().min(1, 'Role is required'),
  branchId: z.string().min(1, 'Branch is required'),
  joiningDate: z.string().min(1, 'Joining date is required'),
  salary: z.number().min(0).optional(),
  address: z.object({
    line1: z.string().min(1, 'Address is required'),
    line2: z.string().optional(),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    pincode: z.string().regex(PATTERNS.pincode, 'Invalid pincode'),
    country: z.string().default('India'),
  }).optional(),
  isActive: z.boolean().default(true),
});

export const supplierSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  contactPerson: z.string().min(2, 'Contact person is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().regex(PATTERNS.phone, 'Invalid phone number'),
  address: z.object({
    line1: z.string().min(1, 'Address is required'),
    line2: z.string().optional(),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    pincode: z.string().regex(PATTERNS.pincode, 'Invalid pincode'),
    country: z.string().default('India'),
  }),
  gstNumber: z.string().regex(PATTERNS.gst, 'Invalid GST number').optional().or(z.literal('')),
  paymentTerms: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const bannerSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  image: z.string().url('Invalid image URL'),
  link: z.string().optional(),
  position: z.enum(['home', 'category', 'product']),
  sortOrder: z.number().min(0).default(0),
  isActive: z.boolean().default(true),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const offerSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().min(1, 'Description is required'),
  code: z.string().min(3, 'Code must be at least 3 characters').max(20),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.number().min(0, 'Discount must be positive'),
  minOrderValue: z.number().min(0).optional(),
  maxDiscount: z.number().min(0).optional(),
  usageLimit: z.number().min(0).optional(),
  isActive: z.boolean().default(true),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  applicableTo: z.enum(['all', 'category', 'product']),
  applicableIds: z.array(z.string()).optional(),
});

// Type exports
export type LoginFormData = z.infer<typeof loginSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type CategoryFormData = z.infer<typeof categorySchema>;
export type ProductFormData = z.infer<typeof productSchema>;
export type CustomerFormData = z.infer<typeof customerSchema>;
export type BranchFormData = z.infer<typeof branchSchema>;
export type EmployeeFormData = z.infer<typeof employeeSchema>;
export type SupplierFormData = z.infer<typeof supplierSchema>;
export type BannerFormData = z.infer<typeof bannerSchema>;
export type OfferFormData = z.infer<typeof offerSchema>;
