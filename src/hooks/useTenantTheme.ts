import { useEffect, useState, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getStoreInfo, type BackendThemeRef } from '@/services/api/store.api';
import { useAuthStore, useThemeStore, type ThemeConfig } from '@/store';
import { defaultThemeConfig } from '@/store/theme.store';
import { APP_CONFIG } from '@/config/app';
import { STORAGE_KEYS } from '@/constants';

function mapBackendThemeToMobile(
  themeRef: BackendThemeRef | null | undefined
): ThemeConfig {
  if (!themeRef) return defaultThemeConfig;
  return {
    primaryColor: themeRef.accentColor || defaultThemeConfig.primaryColor,
    secondaryColor:
      themeRef.actionTo || themeRef.badgeBg || defaultThemeConfig.secondaryColor,
    sidebarColor: '#ffffff',
    themeMode: 'light',
    accentLight: themeRef.accentLight,
    accentDark: themeRef.accentDark,
    actionFrom: themeRef.actionFrom,
    actionTo: themeRef.actionTo,
    badgeBg: themeRef.badgeBg,
    heroFrom: themeRef.heroFrom,
    heroVia: themeRef.heroVia,
    heroTo: themeRef.heroTo,
  };
}

/**
 * Build a ThemeConfig from the admin's `settings.themeConfig` blob.
 * This is the theme the admin customises in Settings -> Appearance.
 */
function mapAdminThemeToMobile(
  adminTheme: Record<string, any>
): ThemeConfig {
  return {
    primaryColor: adminTheme.primaryColor || defaultThemeConfig.primaryColor,
    secondaryColor: adminTheme.secondaryColor || defaultThemeConfig.secondaryColor,
    sidebarColor: adminTheme.sidebarColor || '#ffffff',
    themeMode: adminTheme.themeMode || 'light',
    // Admin theme may not have the full gradient palette — leave them
    // undefined so ThemeContext falls back to auto-computed shades.
    accentLight: adminTheme.accentLight,
    accentDark: adminTheme.accentDark,
    actionFrom: adminTheme.actionFrom,
    actionTo: adminTheme.actionTo,
    badgeBg: adminTheme.badgeBg,
    heroFrom: adminTheme.heroFrom,
    heroVia: adminTheme.heroVia,
    heroTo: adminTheme.heroTo,
  };
}

/**
 * Keeps the mobile theme in sync with the tenant's theme selection.
 *
 * Priority (same as the web ScannerPage):
 *   1. Admin themeConfig (settings.themeConfig) — the colors the admin
 *      customises in Settings -> Appearance
 *   2. Storefront themeRef — the preset theme with full gradient palette
 *   3. Hard-coded defaults (Festival Red)
 *
 * Fetches /api/store/info on mount and whenever the app comes back to
 * the foreground, then feeds the colors into the Zustand theme store so
 * the UI re-renders automatically.
 *
 * Mount this once, high in the tree (e.g. inside the root navigator).
 */
export function useTenantTheme() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setThemeConfig = useThemeStore((s) => s.setThemeConfig);
  const queryClient = useQueryClient();

  // ── FIX 1: Ensure slug is in AsyncStorage BEFORE the query fires ──
  // Without this gate, the very first API call can go without the
  // X-Tenant-Slug header → backend returns 400 → stale cache wins.
  const [slugReady, setSlugReady] = useState(false);
  const didClearCache = useRef(false);

  useEffect(() => {
    const ensureSlug = async () => {
      try {
        const existing = await AsyncStorage.getItem(STORAGE_KEYS.TENANT_SLUG);
        if (!existing && APP_CONFIG.tenantSlug) {
          console.log('[useTenantTheme] Setting tenant slug from APP_CONFIG:', APP_CONFIG.tenantSlug);
          await AsyncStorage.setItem(STORAGE_KEYS.TENANT_SLUG, APP_CONFIG.tenantSlug);
        } else {
          console.log('[useTenantTheme] Tenant slug already in storage:', existing);
        }
        // Only mark ready if we actually have a slug from somewhere
        const hasSlug = !!(existing || APP_CONFIG.tenantSlug);
        if (!hasSlug) {
          console.log('[useTenantTheme] No tenant slug available — skipping theme fetch until login');
          return;
        }
      } catch (err) {
        console.warn('[useTenantTheme] Failed to ensure slug:', err);
      }

      if (!didClearCache.current) {
        didClearCache.current = true;
        queryClient.removeQueries({ queryKey: ['tenantTheme'] });
        console.log('[useTenantTheme] Cleared stale tenantTheme query cache');
      }

      setSlugReady(true);
    };

    ensureSlug();
  }, [queryClient]);

  const query = useQuery({
    queryKey: ['tenantTheme'],
    queryFn: async () => {
      console.log('[useTenantTheme] === FETCHING STORE INFO FROM API ===');
      try {
        const data = await getStoreInfo();
        console.log('[useTenantTheme] Store info received OK:',
          JSON.stringify({
            hasThemeRef: !!data.themeRef,
            themeRefAccent: data.themeRef?.accentColor || 'none',
            hasSettings: !!data.settings,
            settingsThemePrimary: (data.settings as any)?.themeConfig?.primaryColor || 'not set',
            settingsThemeSecondary: (data.settings as any)?.themeConfig?.secondaryColor || 'not set',
            settingsThemeSidebar: (data.settings as any)?.themeConfig?.sidebarColor || 'not set',
          })
        );
        return data;
      } catch (err: any) {
        console.error('[useTenantTheme] Store info fetch FAILED:', err?.message || err);
        throw err;
      }
    },
    // ── FIX 3: Only fetch AFTER the slug is confirmed in AsyncStorage ──
    enabled: slugReady,
    // Always consider data stale so we refetch on every mount
    staleTime: 0,
    // Don't use restored cache data (we cleared it above)
    refetchOnMount: 'always',
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });

  // Apply the theme whenever the query data updates.
  // Priority: admin settings.themeConfig -> storefront themeRef -> default
  useEffect(() => {
    if (query.data) {
      // 1. Try admin theme from settings.themeConfig
      const settingsBlob = query.data.settings as Record<string, any> | null;
      const adminTheme = settingsBlob?.themeConfig;

      if (adminTheme?.primaryColor) {
        const mapped = mapAdminThemeToMobile(adminTheme);
        console.log('[useTenantTheme] >>> APPLYING ADMIN THEME <<<',
          'primary:', mapped.primaryColor,
          'secondary:', mapped.secondaryColor,
          'sidebar:', mapped.sidebarColor,
          'mode:', mapped.themeMode
        );
        setThemeConfig(mapped);
        return;
      }

      // 2. Fall back to storefront themeRef
      if (query.data.themeRef) {
        const mapped = mapBackendThemeToMobile(query.data.themeRef);
        console.log('[useTenantTheme] Applying STOREFRONT theme:', mapped.primaryColor);
        setThemeConfig(mapped);
        return;
      }

      // 3. Fall back to default
      console.log('[useTenantTheme] No theme in DB, applying default');
      setThemeConfig(defaultThemeConfig);
    }
  }, [query.data, setThemeConfig]);

  // Log errors prominently
  useEffect(() => {
    if (query.error) {
      console.error('[useTenantTheme] !!! QUERY ERROR !!!', query.error);
    }
  }, [query.error]);

  // Log query status changes
  useEffect(() => {
    console.log('[useTenantTheme] Query status:', query.status,
      'fetchStatus:', query.fetchStatus,
      'slugReady:', slugReady,
      'hasData:', !!query.data
    );
  }, [query.status, query.fetchStatus, slugReady, query.data]);

  // On Android/iOS there's no "window focus" event — use AppState instead so
  // we refetch when the user returns from backgrounding the app.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active' && slugReady) {
        console.log('[useTenantTheme] App foregrounded — refetching theme');
        query.refetch();
      }
    });
    return () => sub.remove();
  }, [query, slugReady]);

  // After login, the tenant slug is in AsyncStorage — re-check and fetch theme
  useEffect(() => {
    if (isAuthenticated && !slugReady) {
      AsyncStorage.getItem(STORAGE_KEYS.TENANT_SLUG).then((slug) => {
        if (slug) {
          console.log('[useTenantTheme] Slug now available after login:', slug);
          setSlugReady(true);
        }
      });
    } else if (isAuthenticated && slugReady) {
      console.log('[useTenantTheme] Auth state changed — refetching theme');
      query.refetch();
    }
  }, [isAuthenticated, slugReady]);
}
