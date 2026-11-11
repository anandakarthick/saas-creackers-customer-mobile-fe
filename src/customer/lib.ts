/** Small view helpers for the customer app. */
import { assetUrl } from './api/client';
import type { Product } from './api/storefront';

/** Full URL of a product's primary image (or first image). */
export function productImage(p?: Partial<Product> | null): string | undefined {
  const imgs = p?.images || [];
  const chosen = imgs.find((i: any) => i.isPrimary) || imgs[0];
  return assetUrl(chosen?.url);
}

export function isOutOfStock(p?: Partial<Product> | null): boolean {
  if (!p) return true;
  if (p.status === 'OUT_OF_STOCK' || p.status === 'INACTIVE') return true;
  return (p.quantity ?? 0) <= 0;
}
