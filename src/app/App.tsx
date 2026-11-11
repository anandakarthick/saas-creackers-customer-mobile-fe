import React, { useEffect, useState, useMemo } from 'react';
import { StatusBar, View, ActivityIndicator, StyleSheet, AppState, DeviceEventEmitter, Platform, Text, ScrollView, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from '@/navigation/navigationRef';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider, MD3LightTheme, MD3DarkTheme, configureFonts } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  QueryClient,
  QueryClientProvider,
  onlineManager,
  focusManager,
} from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootNavigator } from '@/navigation';
import { ThemeProvider, useTheme, colors, typography, borderRadius } from '@/theme';
import { useAppStore } from '@/store';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useNotificationSocket } from '@/hooks/useNotificationSocket';
import { notificationService } from '@/services/notifications';
import { initApiClient } from '@/services/api/client';
import { APP_CONFIG } from '@/config/app';
import { startSyncRunner } from '@/services/offline/queue';
import { subscribeNetwork, isOnline } from '@/services/offline/network';
import {
  restoreQueryCache,
  startQueryPersistence,
  flushQueryCache,
} from '@/services/offline/queryPersister';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { WhatsAppDisconnectAlert } from '@/components/common/WhatsAppDisconnectAlert';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

// Global JS error handler - catches fatal errors outside React tree (native bridge crashes etc.)
const _origHandler = (global as any).ErrorUtils?.getGlobalHandler?.();
(global as any).ErrorUtils?.setGlobalHandler?.((error: any, isFatal: boolean) => {
  console.error('[GLOBAL ERROR]', isFatal ? 'FATAL' : 'non-fatal', error?.message || error);
  try {
    AsyncStorage.setItem('@saas/last-crash', JSON.stringify({
      message: error?.message || String(error),
      stack: (error?.stack || '').split('\n').slice(0, 10).join('\n'),
      isFatal,
      time: new Date().toISOString(),
    }));
  } catch {}
  if (_origHandler) _origHandler(error, isFatal);
});

// ── React Query online / focus integration ──────────────────────
//
// Wire React Query's onlineManager to our custom /health-based network
// detector so queries automatically pause when the backend is unreachable
// and resume (+ refetch stale data) when it comes back.

onlineManager.setEventListener((setOnline) => {
  return subscribeNetwork((online) => {
    setOnline(online);
  });
});
onlineManager.setOnline(isOnline());

// Tell React Query when the app comes back to the foreground so it can
// refetch stale queries automatically (same behaviour as browser tab focus).
focusManager.setEventListener((setFocused) => {
  const subscription = AppState.addEventListener('change', (state) => {
    setFocused(state === 'active');
  });
  return () => subscription.remove();
});

// ── QueryClient with offline-first defaults ─────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30,   // 30 minutes (formerly cacheTime)
      // ↓ KEY for offline support ↓
      // 'offlineFirst' executes the queryFn once even when offline.
      // If it fails AND there is cached/hydrated data → shows cached data.
      // If it succeeds → updates the cache as normal.
      // Retries pause until online. When online again → auto-refetch.
      networkMode: 'offlineFirst',
      // Keep previous data while refetching so the UI never goes blank
      // when switching from cached → fresh.
      placeholderData: (previousData: any) => previousData,
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
});

// Font configuration for Paper
const fontConfig = {
  displayLarge: typography.variants.h1,
  displayMedium: typography.variants.h2,
  displaySmall: typography.variants.h3,
  headlineLarge: typography.variants.h2,
  headlineMedium: typography.variants.h3,
  headlineSmall: typography.variants.h4,
  titleLarge: typography.variants.h4,
  titleMedium: typography.variants.h5,
  titleSmall: typography.variants.h6,
  bodyLarge: typography.variants.body1,
  bodyMedium: typography.variants.body2,
  bodySmall: typography.variants.caption,
  labelLarge: typography.variants.button,
  labelMedium: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
  },
  labelSmall: typography.variants.overline,
};

const LoadingScreen: React.FC = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={colors.primary.main} />
  </View>
);

// Inner component that uses dynamic theme
const ThemedApp: React.FC = () => {
  const { colors: themeColors, isDarkMode } = useTheme();

  useNotificationSocket();

  // Listen for navigation events from native (e.g. "View Order" on alert overlay)
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const sub = DeviceEventEmitter.addListener('onNavigateFromNative', (event) => {
      console.log('[App] onNavigateFromNative:', event);
      const { screen, orderId } = event || {};
      if (screen === 'OrderDetail' && orderId) {
        // Navigate to Orders first, then to OrderDetail
        const { navigateFromOutside } = require('@/navigation/navigationRef');
        navigateFromOutside('Orders', undefined);
        setTimeout(() => {
          navigateFromOutside('OrderDetail', { id: orderId });
        }, 300);
      }
    });

    return () => sub.remove();
  }, []);

  // Create dynamic Paper theme based on ThemeContext
  const paperTheme = useMemo(() => {
    const baseTheme = isDarkMode ? MD3DarkTheme : MD3LightTheme;

    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        primary: themeColors.primary.main,
        primaryContainer: themeColors.primary.light,
        secondary: themeColors.secondary.main,
        secondaryContainer: themeColors.secondary.light,
        tertiary: themeColors.accent.main,
        tertiaryContainer: themeColors.accent.light,
        surface: themeColors.surface.default,
        surfaceVariant: themeColors.surface.variant,
        surfaceDisabled: themeColors.surface.disabled,
        background: themeColors.background.default,
        error: themeColors.error.main,
        errorContainer: themeColors.error.light,
        onPrimary: themeColors.primary.contrast,
        onPrimaryContainer: themeColors.primary.dark,
        onSecondary: themeColors.secondary.contrast,
        onSecondaryContainer: themeColors.secondary.dark,
        onTertiary: themeColors.accent.contrast,
        onTertiaryContainer: themeColors.accent.dark,
        onSurface: themeColors.text.primary,
        onSurfaceVariant: themeColors.text.secondary,
        onSurfaceDisabled: themeColors.text.disabled,
        onError: themeColors.error.contrast,
        onErrorContainer: themeColors.error.dark,
        onBackground: themeColors.text.primary,
        outline: themeColors.border.default,
        outlineVariant: themeColors.neutral[200],
        inverseSurface: themeColors.neutral[800],
        inverseOnSurface: themeColors.text.inverse,
        inversePrimary: themeColors.primary.light,
        elevation: {
          level0: 'transparent',
          level1: themeColors.surface.default,
          level2: themeColors.surface.default,
          level3: themeColors.surface.variant,
          level4: themeColors.surface.variant,
          level5: themeColors.surface.variant,
        },
      },
      fonts: configureFonts({ config: fontConfig }),
      roundness: borderRadius.md,
    };
  }, [themeColors, isDarkMode]);

  return (
    <PaperProvider theme={paperTheme}>
      <NavigationContainer ref={navigationRef}>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent={true}
        />
        <ErrorBoundary label="OfflineBanner">
          <OfflineBanner />
        </ErrorBoundary>
        <ErrorBoundary label="RootNavigator">
          <RootNavigator />
        </ErrorBoundary>
        <ErrorBoundary label="WhatsAppAlert">
          <WhatsAppDisconnectAlert />
        </ErrorBoundary>
      </NavigationContainer>
    </PaperProvider>
  );
};

const AppContent: React.FC = () => {
  const [isReady, setIsReady] = useState(false);
  const [lastCrash, setLastCrash] = useState<string | null>(null);
  const setInitialized = useAppStore((s) => s.setInitialized);

  // Initialize app config (theme, etc.) from local storage or API
  const { isLoading: isConfigLoading, isConfigLoaded, error: configError } = useAppConfig();

  useEffect(() => {
    const prepare = async () => {
      try {
        // Check for previous crash log
        const crashLog = await AsyncStorage.getItem('@saas/last-crash');
        if (crashLog) {
          setLastCrash(crashLog);
          await AsyncStorage.removeItem('@saas/last-crash');
        }

        // ── 0a. Version migration — clear stale data after APK update ──
        // AsyncStorage survives APK updates, so stale auth tokens, query
        // caches, and theme data from the old build can crash the new one.
        // Compare the stored version against the current build version and
        // wipe persisted state when they differ.
        const APP_VERSION_KEY = '@saas/app-version';
        const storedVersion = await AsyncStorage.getItem(APP_VERSION_KEY);
        if (storedVersion !== APP_CONFIG.version) {
          console.log(`[App] Version changed (${storedVersion} → ${APP_CONFIG.version}) — clearing stale data`);
          await AsyncStorage.multiRemove([
            '@pyropark/auth_token',
            '@pyropark/refresh_token',
            '@pyropark/user',
            '@pyropark/theme',
            '@pyropark/theme_config',
            '@pyropark/tenant_slug',
            '@pyropark/cart',
            '@pyropark/notifications',
            '@saas/query-cache',
          ]);
          queryClient.clear();
          await AsyncStorage.setItem(APP_VERSION_KEY, APP_CONFIG.version);
        }

        // ── 0b. Load tenant config and apply dynamic API URL ────────
        await initApiClient();

        // ── 1. Restore React Query cache from AsyncStorage ──────────
        await restoreQueryCache(queryClient);

        // ── 2. Start auto-persisting query cache changes ────────────
        startQueryPersistence(queryClient);

        // Small boot delay for other subsystems
        await new Promise<void>((resolve) => setTimeout(resolve, 100));

        // Initialize Firebase notifications
        await notificationService.initialize();

        // Start the offline mutation sync runner
        startSyncRunner();
      } catch (e) {
        console.warn('Initialization error:', e);
      } finally {
        setIsReady(true);
        setInitialized(true);
      }
    };

    prepare();

    // ── Flush cache when app goes to background ──────────────────
    // Ensures the latest data is persisted before the OS may kill us.
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        flushQueryCache(queryClient);
      }
    });

    return () => {
      appStateSub.remove();
    };
  }, [setInitialized]);

  // Show loading screen while app initializes or config loads
  if (!isReady || isConfigLoading) {
    return <LoadingScreen />;
  }

  // Log config error but continue with default theme
  if (configError) {
    console.warn('Config load error (using defaults):', configError);
  }

  return (
    <ErrorBoundary label="AppContent">
      {lastCrash && (
        <View style={crashStyles.banner}>
          <Text style={crashStyles.bannerTitle}>Previous crash detected:</Text>
          <ScrollView style={crashStyles.crashBox}>
            <Text style={crashStyles.crashText}>{lastCrash}</Text>
          </ScrollView>
          <TouchableOpacity style={crashStyles.dismissBtn} onPress={() => setLastCrash(null)}>
            <Text style={crashStyles.dismissText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary label="App Root">
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <AppContent />
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.default,
  },
});

const crashStyles = StyleSheet.create({
  banner: {
    backgroundColor: '#FEF2F2',
    borderBottomWidth: 1,
    borderBottomColor: '#FECACA',
    padding: 12,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 4,
  },
  crashBox: {
    maxHeight: 120,
    backgroundColor: '#FFF',
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
  },
  crashText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#991B1B',
  },
  dismissBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#DC2626',
    borderRadius: 4,
  },
  dismissText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default App;
