// Default color palette — matches web admin defaults so both apps look
// consistent before the tenant theme loads from the backend.
export const colors = {
  // Primary Colors (Blue — same as web admin DEFAULT_THEME)
  primary: {
    main: '#3B82F6',
    light: '#60A5FA',
    dark: '#2563EB',
    contrast: '#FFFFFF',
  },

  // Secondary Colors (Indigo — same as web admin DEFAULT_THEME)
  secondary: {
    main: '#6366F1',
    light: '#818CF8',
    dark: '#4F46E5',
    contrast: '#FFFFFF',
  },

  // Accent Colors (Orange)
  accent: {
    main: '#F97316',
    light: '#FB923C',
    dark: '#EA580C',
    contrast: '#FFFFFF',
  },

  // Semantic Colors
  success: {
    main: '#10B981',
    light: '#34D399',
    dark: '#059669',
    contrast: '#FFFFFF',
  },

  warning: {
    main: '#F59E0B',
    light: '#FBBF24',
    dark: '#D97706',
    contrast: '#000000',
  },

  error: {
    main: '#EF4444',
    light: '#F87171',
    dark: '#DC2626',
    contrast: '#FFFFFF',
  },

  info: {
    main: '#3B82F6',
    light: '#60A5FA',
    dark: '#2563EB',
    contrast: '#FFFFFF',
  },

  // Neutral Colors
  neutral: {
    0: '#FFFFFF',
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    1000: '#000000',
  },

  // Background Colors
  background: {
    default: '#F8FAFC',
    paper: '#FFFFFF',
    elevated: '#FFFFFF',
    disabled: '#E2E8F0',
  },

  // Surface Colors
  surface: {
    default: '#FFFFFF',
    variant: '#F1F5F9',
    disabled: '#E2E8F0',
  },

  // Text Colors
  text: {
    primary: '#0F172A',
    secondary: '#475569',
    tertiary: '#94A3B8',
    disabled: '#CBD5E1',
    inverse: '#FFFFFF',
  },

  // Border Colors
  border: {
    default: '#E2E8F0',
    focus: '#3B82F6',
    error: '#EF4444',
  },

  // Status Colors for Orders
  status: {
    pending: '#F59E0B',
    processing: '#3B82F6',
    shipped: '#8B5CF6',
    delivered: '#10B981',
    cancelled: '#EF4444',
    refunded: '#6B7280',
  },

  // Stock Status Colors
  stock: {
    inStock: '#10B981',
    lowStock: '#F59E0B',
    outOfStock: '#EF4444',
  },
} as const;

export type Colors = typeof colors;
