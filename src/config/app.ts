export const APP_CONFIG = {
  name: 'Cracker Store',
  shortName: 'Cracker Store',
  tagline: 'Premium Crackers & Fireworks',
  version: '1.2.0',

  // Tenant slug — left empty for template APK. The actual slug is injected
  // via assets/tenant-config.json when the company admin downloads the APK.
  // If present, it auto-fills the login screen; otherwise user enters it.
  tenantSlug: '',

  // Business Info (defaults — overridden at runtime from tenant API)
  business: {
    name: 'Cracker Store',
    gstNumber: '',
    phone: '',
    email: '',
    website: '',
    address: {
      line1: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
    },
  },

  // App Settings
  settings: {
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'hh:mm A',
    dateTimeFormat: 'DD/MM/YYYY hh:mm A',
    currency: {
      code: 'INR',
      symbol: '\u20B9',
      position: 'before', // 'before' or 'after'
    },
    pagination: {
      defaultPageSize: 20,
      pageSizeOptions: [10, 20, 50, 100],
    },
    lowStockThreshold: 10,
  },

  // Feature Flags
  features: {
    multiLanguage: false,
    darkMode: false,
    notifications: true,
    offlineMode: true,
    biometricAuth: true,
  },

  // Tax Configuration
  tax: {
    defaultRate: 18, // GST 18%
    rates: [
      { label: 'No Tax', value: 0 },
      { label: 'GST 5%', value: 5 },
      { label: 'GST 12%', value: 12 },
      { label: 'GST 18%', value: 18 },
      { label: 'GST 28%', value: 28 },
    ],
  },

  // Unit Options
  units: [
    { label: 'Piece', value: 'pcs' },
    { label: 'Box', value: 'box' },
    { label: 'Pack', value: 'pack' },
    { label: 'Dozen', value: 'dozen' },
    { label: 'Kilogram', value: 'kg' },
    { label: 'Gram', value: 'g' },
  ],
};
