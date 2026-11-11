import { API_CONFIG } from '@/config/api';

/**
 * Convert a backend image URL (which may be relative, e.g. "/uploads/1/products/abc.jpg")
 * into an absolute URL the mobile device can load over the network.
 *
 * If the input is already absolute (http/https) or a data URI, it's returned unchanged.
 * If it's null/empty, returns undefined so <Image source={{ uri }}/> shows the fallback.
 */
export function resolveImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  // Already absolute or data URI
  if (/^(https?:\/\/|data:)/.test(url)) return url;
  // Strip the /api suffix from BASE_URL — static files (uploads, logos) are
  // served from the domain root, not behind the /api prefix.
  const base = API_CONFIG.BASE_URL.replace(/\/+$/, '').replace(/\/api$/, '');
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${base}${path}`;
}

/**
 * Resolve an array of image URLs (typical product.images list).
 */
export function resolveImageUrls(urls: Array<string | null | undefined>): string[] {
  return urls.map(resolveImageUrl).filter((u): u is string => !!u);
}

/**
 * Safely extract a usable image URI from a value that could be:
 * - a plain URL string: "/uploads/foo.jpg"
 * - an image object from the backend: { url: "/uploads/foo.jpg", id: 5 }
 * - null / undefined
 * Returns a resolved absolute URL or undefined.
 */
export function safeImageUri(img: any): string | undefined {
  if (!img) return undefined;
  if (typeof img === 'string') return resolveImageUrl(img);
  if (typeof img === 'object') {
    const raw = img.url || img.uri || img.src || img.path || '';
    return raw ? resolveImageUrl(String(raw)) : undefined;
  }
  return undefined;
}
