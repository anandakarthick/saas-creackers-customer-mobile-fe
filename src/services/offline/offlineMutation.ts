import { isOnline } from './network';
import { enqueueMutation } from './queue';
import type { QueuedMutation } from './storage';

/**
 * Generic offline-aware mutation wrapper.
 *
 * Wraps any API write (POST / PUT / PATCH / DELETE) so it automatically
 * falls back to the offline queue when connectivity is unavailable.
 *
 * Usage in API modules:
 *
 *   export const updateSettings = (data: any) =>
 *     offlineMutation({
 *       url: ENDPOINTS.SETTINGS,
 *       method: 'PUT',
 *       body: data,
 *       label: 'Update store settings',
 *       apiFn: () => http.put(ENDPOINTS.SETTINGS, data),
 *     });
 *
 * When online the `apiFn` runs normally and its result is returned.
 * When offline (or on a network-level error with no HTTP response) the
 * payload is persisted to AsyncStorage and a synthetic `{ __offline }` marker
 * is returned so the caller can show an optimistic UI.
 *
 * The sync runner (`queue.ts → runSync`) drains the queue when connectivity
 * returns, using the raw `url / method / body` via the shared apiClient
 * (which injects auth + tenant headers automatically). The backend's
 * idempotency middleware ensures exactly-once processing if the original
 * request actually went through but its response was lost in flight.
 */

interface OfflineMutationArgs {
  /** Endpoint path, e.g. `/admin/settings` */
  url: string;
  /** HTTP method */
  method: QueuedMutation['method'];
  /** JSON body to queue */
  body?: any;
  /** Human-readable label for the OfflineBanner / queue UI */
  label?: string;
  /** Extra headers (auth is added automatically at replay) */
  headers?: Record<string, string>;
  /** The actual API call to execute when online */
  apiFn: () => Promise<any>;
  /** Value returned to the caller when the mutation is queued offline */
  offlineResult?: any;
}

export async function offlineMutation(args: OfflineMutationArgs): Promise<any> {
  // ── Pre-flight: known offline → queue immediately ────────────
  if (!isOnline()) {
    await enqueueMutation({
      url: args.url,
      method: args.method,
      body: args.body,
      label: args.label,
      headers: args.headers,
    });
    return args.offlineResult ?? { __offline: true, __queued: true };
  }

  // ── Online: try the real API call ────────────────────────────
  try {
    return await args.apiFn();
  } catch (err: any) {
    // If there's no HTTP response at all (network failure, timeout,
    // ERR_NETWORK), queue the mutation for later. 4xx / 5xx errors
    // propagate normally so the UI can show validation / server errors.
    const noResponse = !err?.response || err?.code === 'ERR_NETWORK';
    if (noResponse) {
      await enqueueMutation({
        url: args.url,
        method: args.method,
        body: args.body,
        label: args.label,
        headers: args.headers,
      });
      return args.offlineResult ?? { __offline: true, __queued: true };
    }
    throw err;
  }
}
