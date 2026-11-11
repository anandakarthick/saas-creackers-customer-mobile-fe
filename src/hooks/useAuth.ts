import { useCallback } from 'react';
import { Platform, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore, useThemeStore, type ThemeConfig } from '@/store';
import { defaultThemeConfig } from '@/store/theme.store';
import type { User } from '@/types';
import { STORAGE_KEYS } from '@/constants';
import * as authApi from '@/services/api/auth.api';
import { getStoreInfo, type BackendThemeRef } from '@/services/api/store.api';
import { notificationService } from '@/services/notifications/notificationService';

/**
 * Map the backend's themeRef row into the mobile ThemeConfig. The primary color
 * drives almost every palette; we also pass through the lighter/darker tints
 * and action/hero colors so individual components can pick them directly.
 */
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

export interface LoginCredentials {
  email: string;
  password: string;
  tenantSlug: string;
}

export const useAuth = () => {
  const {
    user,
    token,
    tenantSlug,
    isAuthenticated,
    isLoading,
    error,
    setLoading,
    setError,
    login: storeLogin,
    logout: storeLogout,
    clearError,
  } = useAuthStore();

  const setThemeConfig = useThemeStore((s) => s.setThemeConfig);
  const queryClient = useQueryClient();

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      setLoading(true);
      clearError();

      try {
        const response = await authApi.login(
          { email: credentials.email, password: credentials.password },
          credentials.tenantSlug.trim().toLowerCase()
        );

        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.accessToken);
        await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.refreshToken);

        // Clear stale query cache and persisted cache before logging in as new user
        try {
          queryClient.clear();
          await AsyncStorage.removeItem('@saas/query-cache');
        } catch {}

        const u = response.user;
        const mappedUser: User = {
          id: String(u.id),
          email: u.email,
          name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
          phone: u.phone || '',
          role: u.role ? { id: u.role.id, name: u.role.name, permissions: (u.role as any).permissions || [] } : { id: 0, name: 'Staff', permissions: [] } as any,
          branchId: u.branchId ? String(u.branchId) : undefined,
          tenantId: u.tenantId,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as User;

        storeLogin(
          mappedUser,
          response.accessToken,
          response.refreshToken,
          credentials.tenantSlug.trim().toLowerCase()
        );

        // Fetch the tenant's theme from the backend and apply it so the mobile
        // UI matches the palette chosen in the web admin. Failure is non-fatal —
        // we fall back to the default theme and continue the login flow.
        //
        // Priority: admin settings.themeConfig → storefront themeRef → default
        try {
          const storeInfo = await getStoreInfo();
          const settingsBlob = storeInfo.settings as Record<string, any> | null;
          const adminTheme = settingsBlob?.themeConfig;

          if (adminTheme?.primaryColor) {
            // Admin-configured theme takes priority (matches web admin appearance)
            setThemeConfig({
              primaryColor: adminTheme.primaryColor || defaultThemeConfig.primaryColor,
              secondaryColor: adminTheme.secondaryColor || defaultThemeConfig.secondaryColor,
              sidebarColor: adminTheme.sidebarColor || '#ffffff',
              themeMode: adminTheme.themeMode || 'light',
              accentLight: adminTheme.accentLight,
              accentDark: adminTheme.accentDark,
              actionFrom: adminTheme.actionFrom,
              actionTo: adminTheme.actionTo,
              badgeBg: adminTheme.badgeBg,
              heroFrom: adminTheme.heroFrom,
              heroVia: adminTheme.heroVia,
              heroTo: adminTheme.heroTo,
            });
          } else {
            setThemeConfig(mapBackendThemeToMobile(storeInfo.themeRef));
          }
        } catch (themeErr) {
          console.warn('Failed to load tenant theme, using default:', themeErr);
          setThemeConfig(defaultThemeConfig);
        }

        // Register device for push notifications (non-blocking)
        notificationService
          .registerWithBackend(String(u.id), u.branchId ? String(u.branchId) : undefined)
          .catch((err) => console.warn('Push registration failed:', err));

        // Request "Display over other apps" + battery optimization
        // permissions so the call-screen-style order overlay works.
        if (Platform.OS === 'android') {
          setTimeout(async () => {
            try {
              const AlertModule = NativeModules.AlertModule;

              // 1) "Display over other apps" — required for the overlay popup
              if (AlertModule?.canDrawOverlays) {
                const canOverlay = await AlertModule.canDrawOverlays();
                if (!canOverlay && AlertModule?.requestOverlayPermission) {
                  console.log('[useAuth] Requesting "Display over other apps" permission');
                  AlertModule.requestOverlayPermission();
                  // Wait for the user to come back from settings
                  await new Promise((r) => setTimeout(r, 4000));
                } else {
                  console.log('[useAuth] Overlay permission already granted ✓');
                }
              }

              // 2) Battery optimization exemption
              if (AlertModule?.isBatteryOptimizationDisabled) {
                const isDisabled = await AlertModule.isBatteryOptimizationDisabled();
                if (!isDisabled && AlertModule?.openBatteryOptimization) {
                  console.log('[useAuth] Opening battery optimization dialog');
                  AlertModule.openBatteryOptimization();
                } else {
                  console.log('[useAuth] Battery optimization already disabled ✓');
                }
              }
            } catch (e) {
              console.warn('[useAuth] Permission requests failed:', e);
            }
          }, 2000);
        }

        return mappedUser;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Login failed';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setLoading, clearError, storeLogin, setError, setThemeConfig, queryClient]
  );

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      // Unregister push notifications (non-blocking)
      const userId = useAuthStore.getState().user?.id;
      if (userId) {
        notificationService.unregisterFromBackend(String(userId)).catch(() => {});
      }

      await authApi.logoutApi();
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN),
        AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN),
        AsyncStorage.removeItem(STORAGE_KEYS.TENANT_SLUG),
      ]);
      storeLogout();
    } finally {
      setLoading(false);
    }
  }, [setLoading, storeLogout]);

  const forgotPassword = useCallback(
    async (email: string) => {
      setLoading(true);
      clearError();
      try {
        await authApi.forgotPassword(email);
        return { success: true, message: 'Password reset email sent' };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to send reset email';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setLoading, clearError, setError]
  );

  const checkPermission = useCallback(
    (module: string, action: string): boolean => {
      if (!user?.role?.permissions) return false;
      return user.role.permissions.some(
        (p) => p.module === module && p.action === action
      );
    },
    [user]
  );

  return {
    user,
    token,
    tenantSlug,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    forgotPassword,
    checkPermission,
    clearError,
  };
};
