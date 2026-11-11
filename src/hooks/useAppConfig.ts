import { useEffect, useState } from 'react';
import { useThemeStore, defaultThemeConfig } from '@/store';

interface UseAppConfigReturn {
  isLoading: boolean;
  isConfigLoaded: boolean;
  error: string | null;
  refreshConfig: () => Promise<void>;
}

/**
 * Hook to manage app configuration initialization.
 *
 * Responsible ONLY for ensuring a theme exists in the Zustand store so the
 * UI can render immediately on cold-start.  The *real* theme is fetched
 * from the backend by `useTenantTheme` (via /api/store/info) — that hook
 * overrides whatever default we set here as soon as the API responds.
 *
 * IMPORTANT: We ALWAYS apply the default theme on cold-start, even if a
 * cached theme exists. This prevents stale cached themes from persisting
 * forever — `useTenantTheme` will apply the correct DB theme within a
 * second or two.
 */
export const useAppConfig = (): UseAppConfigReturn => {
  const [isLoading, setIsLoading] = useState(true);
  const [error] = useState<string | null>(null);

  const isThemeLoaded = useThemeStore((s) => s.isThemeLoaded);
  const setThemeConfig = useThemeStore((s) => s.setThemeConfig);

  const refreshConfig = async () => {
    // Theme refresh is now handled entirely by useTenantTheme.
    // This is a no-op kept for API compatibility.
  };

  useEffect(() => {
    const initConfig = () => {
      // Always set a default theme so the app renders immediately.
      // useTenantTheme will override this with the real DB theme
      // once the /store/info API responds (~1-2 seconds).
      //
      // We intentionally do NOT trust the cached theme here because
      // it may be stale (from a previous app version or a different
      // tenant theme that has since changed).
      if (isThemeLoaded) {
        console.log('[useAppConfig] Theme store is hydrated — unblocking render');
      } else {
        console.log('[useAppConfig] No cached theme — applying default to unblock render');
        setThemeConfig(defaultThemeConfig);
      }
      setIsLoading(false);
    };

    // Small delay to let Zustand rehydrate from AsyncStorage
    const timer = setTimeout(initConfig, 100);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isLoading,
    isConfigLoaded: isThemeLoaded,
    error,
    refreshConfig,
  };
};
