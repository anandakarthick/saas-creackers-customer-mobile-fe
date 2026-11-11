import { useQuery } from '@tanstack/react-query';
import { getStoreInfo, type StoreInfoResponse } from '@/services/api/store.api';
import { useAuthStore } from '@/store';
import { resolveImageUrl } from '@/utils/imageUrl';

/**
 * Fetches the tenant's public store info (name, logo, theme, etc.) from the
 * backend. Used by the drawer header, login screen branding, and anywhere
 * else we show the tenant's identity.
 *
 * Only runs when we have a tenantSlug (either because the user has logged in,
 * or because they typed one on the login screen). Returns undefined data
 * while loading so components can fall back to the app defaults.
 */
export function useStoreInfo() {
  const tenantSlug = useAuthStore((s) => s.tenantSlug);

  const query = useQuery({
    queryKey: ['storeInfo', tenantSlug],
    queryFn: () => getStoreInfo(),
    enabled: !!tenantSlug,
    staleTime: 5 * 60_000, // 5 min
  });

  const info: StoreInfoResponse | undefined = query.data;

  return {
    info,
    isLoading: query.isLoading,
    name: info?.name,
    logoUrl: resolveImageUrl(info?.logoUrl ?? undefined),
    tagline: (info?.settings as any)?.tagline || '',
    currency: info?.currency,
  };
}
