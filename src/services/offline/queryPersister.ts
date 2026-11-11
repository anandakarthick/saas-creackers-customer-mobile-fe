import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, dehydrate, hydrate } from '@tanstack/react-query';

/**
 * React Query cache persistence layer using AsyncStorage.
 *
 * On app startup we hydrate the QueryClient from a stored snapshot so
 * screens render cached data immediately — even when offline. On every
 * successful query fetch we debounce-save the dehydrated state back to
 * storage so the next cold-start has fresh-ish data.
 *
 * Only queries whose key prefix appears in PERSISTABLE_KEYS are saved.
 * This keeps the cache compact (AsyncStorage isn't a database) and avoids
 * caching one-shot or user-scoped data that shouldn't survive a restart.
 */

const CACHE_KEY = '@saas/query-cache';
const PERSIST_DEBOUNCE_MS = 2_000; // batch writes — 2s after last cache change
const MAX_CACHE_AGE_MS = 1000 * 60 * 60 * 24; // 24 hours — discard stale snapshots

/**
 * Query key prefixes that are worth persisting for offline access.
 * These cover the screens a POS user / store admin visits most often.
 */
const PERSISTABLE_KEYS: string[] = [
  // Settings & config
  'adminSettings',
  'storeInfo',
  'invoiceSettings',
  'themeSettings',
  'whatsappStatus',
  'paymentMethods',
  // POS
  'posProducts',
  'posSales',
  'posStats',
  'posBillNumber',
  // Catalog
  'products',
  'product',
  'categories',
  // Orders & Customers
  'orders',
  'order',
  'customers',
  'customer',
  // Inventory
  'stock',
  'lowStock',
  'stockValuation',
  // Dashboard
  'dashboard',
  'dashboardStats',
  // Branches & users
  'branches',
  'users',
  'profile',
  // Reports
  'reports',
  // Suppliers
  'suppliers',
  // Marketing
  'banners',
  'socialLinks',
  'coupons',
  // Expenses & Assets
  'expenses',
  'assets',
];

function shouldPersistQuery(queryKey: readonly unknown[]): boolean {
  const first = String(queryKey[0] || '');
  return PERSISTABLE_KEYS.some(
    (prefix) => first === prefix || first.startsWith(prefix),
  );
}

// ── Restore ─────────────────────────────────────────────────────

/**
 * Hydrate the QueryClient from the last persisted snapshot.
 * Call this ONCE during app initialisation, BEFORE rendering any screens.
 */
export async function restoreQueryCache(queryClient: QueryClient): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) {
      console.log('[Offline] No persisted query cache found');
      return;
    }

    const parsed = JSON.parse(raw);
    const { timestamp, state } = parsed;

    // Discard if the snapshot is older than MAX_CACHE_AGE_MS
    if (timestamp && Date.now() - timestamp > MAX_CACHE_AGE_MS) {
      console.log('[Offline] Query cache too old — discarding');
      await AsyncStorage.removeItem(CACHE_KEY);
      return;
    }

    if (state) {
      hydrate(queryClient, state);
      console.log('[Offline] Query cache restored from storage');
    }
  } catch (err) {
    console.warn('[Offline] Failed to restore query cache:', err);
    // Non-fatal — the app will fetch fresh data if it can.
  }
}

// ── Persist ─────────────────────────────────────────────────────

let persistTimer: ReturnType<typeof setTimeout> | null = null;

function saveQueryCache(queryClient: QueryClient): void {
  // Debounce: multiple rapid cache updates only trigger one write.
  if (persistTimer) clearTimeout(persistTimer);

  persistTimer = setTimeout(async () => {
    try {
      const dehydratedState = dehydrate(queryClient, {
        shouldDehydrateQuery: (query) => {
          // Only persist successful queries that have data
          if (query.state.status !== 'success') return false;
          if (query.state.data == null) return false;
          return shouldPersistQuery(query.queryKey);
        },
      });

      const payload = JSON.stringify({
        timestamp: Date.now(),
        state: dehydratedState,
      });

      await AsyncStorage.setItem(CACHE_KEY, payload);
    } catch (err) {
      console.warn('[Offline] Failed to persist query cache:', err);
    }
  }, PERSIST_DEBOUNCE_MS);
}

/**
 * Subscribe to the QueryClient cache and auto-persist on every change.
 * Returns an unsubscribe function for cleanup (rarely needed).
 */
export function startQueryPersistence(queryClient: QueryClient): () => void {
  const unsubscribe = queryClient.getQueryCache().subscribe(() => {
    saveQueryCache(queryClient);
  });
  return unsubscribe;
}

/**
 * Force an immediate persist (skip the debounce timer).
 * Useful before the app goes to background / is about to be killed.
 */
export async function flushQueryCache(queryClient: QueryClient): Promise<void> {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }

  try {
    const dehydratedState = dehydrate(queryClient, {
      shouldDehydrateQuery: (query) => {
        if (query.state.status !== 'success') return false;
        if (query.state.data == null) return false;
        return shouldPersistQuery(query.queryKey);
      },
    });

    await AsyncStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ timestamp: Date.now(), state: dehydratedState }),
    );
    console.log('[Offline] Query cache flushed to storage');
  } catch (err) {
    console.warn('[Offline] Failed to flush query cache:', err);
  }
}
