/** Simple customer-app palette. Crackers festive red by default. */
export const theme = {
  accent: '#dc2626',
  accentDark: '#991b1b',
  bg: '#f9fafb',
  card: '#ffffff',
  text: '#111827',
  sub: '#6b7280',
  border: '#e5e7eb',
  muted: '#f3f4f6',
  success: '#16a34a',
  danger: '#dc2626',
  white: '#ffffff',
};

export const CURRENCY = '₹'; // ₹

/** Price formatter without relying on Intl (Hermes-safe). */
export const money = (v: number | string | null | undefined, cur = CURRENCY): string => {
  const n = Number(v || 0);
  return cur + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};
