import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { APP_CONFIG } from '@/config/app';

// Currency Formatting
export const formatCurrency = (amount: number | null | undefined): string => {
  const num = Number(amount);
  if (amount == null || isNaN(num)) return '₹0';
  const { code = 'INR', symbol = '₹', position = 'before' } = APP_CONFIG.settings?.currency || {};
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);

  return position === 'before' ? `${symbol}${formatted}` : `${formatted}${symbol}`;
};

export const formatCurrencyCompact = (amount: number | null | undefined): string => {
  if (amount == null || isNaN(Number(amount))) return '₹0';
  const { symbol = '₹' } = APP_CONFIG.settings?.currency || {};
  if (amount >= 10000000) {
    return `${symbol}${(amount / 10000000).toFixed(1)}Cr`;
  }
  if (amount >= 100000) {
    return `${symbol}${(amount / 100000).toFixed(1)}L`;
  }
  if (amount >= 1000) {
    return `${symbol}${(amount / 1000).toFixed(1)}K`;
  }
  return formatCurrency(amount);
};

// Date Formatting
function toDate(date: string | Date | null | undefined): Date | null {
  if (!date) return null;
  const d = typeof date === 'string' ? parseISO(date) : date;
  return d instanceof Date && !isNaN(d.getTime()) ? d : null;
}

export const formatDate = (date: string | Date | null | undefined): string => {
  const d = toDate(date);
  return d ? format(d, 'dd/MM/yyyy') : '—';
};

export const formatDateTime = (date: string | Date | null | undefined): string => {
  const d = toDate(date);
  return d ? format(d, 'dd/MM/yyyy hh:mm a') : '—';
};

export const formatTime = (date: string | Date | null | undefined): string => {
  const d = toDate(date);
  return d ? format(d, 'hh:mm a') : '—';
};

export const formatRelativeTime = (date: string | Date | null | undefined): string => {
  const d = toDate(date);
  return d ? formatDistanceToNow(d, { addSuffix: true }) : '—';
};

export const formatDateRange = (startDate: string | Date, endDate: string | Date): string => {
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
};

// Number Formatting
export const formatNumber = (num: number | null | undefined, decimals = 0): string => {
  const n = Number(num);
  if (num == null || isNaN(n)) return '0';
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
};

export const formatPercentage = (value: number | null | undefined, decimals = 1): string => {
  const n = Number(value);
  if (value == null || isNaN(n)) return '0%';
  return `${n.toFixed(decimals)}%`;
};

export const formatQuantity = (quantity: number, unit: string): string => {
  return `${formatNumber(quantity)} ${unit}`;
};

// Phone Number Formatting
export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '');

  // Format Indian phone number
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+91 ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
  }

  return phone;
};

// Address Formatting
export const formatAddress = (address: {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
}): string => {
  const parts = [
    address.line1,
    address.line2,
    address.city,
    `${address.state} - ${address.pincode}`,
    address.country,
  ].filter(Boolean);

  return parts.join(', ');
};

export const formatAddressMultiline = (address: {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
}): string => {
  const lines = [
    address.line1,
    address.line2,
    `${address.city}, ${address.state}`,
    address.pincode,
    address.country,
  ].filter(Boolean);

  return lines.join('\n');
};

// Order Number Formatting
export const generateOrderNumber = (): string => {
  const date = format(new Date(), 'yyyyMMdd');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD-${date}-${random}`;
};

// SKU Formatting
export const generateSKU = (category: string, name: string): string => {
  const categoryCode = category.substring(0, 3).toUpperCase();
  const nameCode = name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 5).toUpperCase();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${categoryCode}-${nameCode}-${random}`;
};

// Status Badge Text
export const getStatusText = (status: string | null | undefined): string => {
  if (!status) return '—';
  const statusMap: Record<string, string> = {
    pending: 'Pending',
    processing: 'Processing',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
    draft: 'Draft',
    approved: 'Approved',
    ordered: 'Ordered',
    partially_received: 'Partial',
    received: 'Received',
    paid: 'Paid',
    failed: 'Failed',
    scheduled: 'Scheduled',
    published: 'Published',
    in_stock: 'In Stock',
    low_stock: 'Low Stock',
    out_of_stock: 'Out of Stock',
  };

  return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
};

// Truncate Text
export const truncateText = (text: string | null | undefined, maxLength: number): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

// Initials
export const getInitials = (name: string | null | undefined): string => {
  if (!name) return '';
  return name
    .split(' ')
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2);
};
