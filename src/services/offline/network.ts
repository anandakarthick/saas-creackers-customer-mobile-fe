import { API_CONFIG } from '@/config/api';

/**
 * Mobile network detector.
 *
 * We don't depend on `@react-native-community/netinfo` (avoids adding a
 * native module). Instead we periodically ping the backend's /health
 * endpoint to determine reachability. This is also more accurate than
 * NetInfo's "is interface up" signal — a phone connected to a captive
 * WiFi may show "online" while the backend is unreachable.
 *
 * Subscribers receive online/offline transitions, plus the initial state
 * on subscribe.
 */

type NetCb = (online: boolean) => void;

const subscribers = new Set<NetCb>();
let currentState = true; // assume online until first ping completes
let pingTimer: ReturnType<typeof setTimeout> | null = null;

function notify(online: boolean) {
  if (online === currentState) return;
  currentState = online;
  subscribers.forEach((cb) => cb(online));
}

async function ping(): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const url = `${String(API_CONFIG.BASE_URL).replace(/\/+$/, '')}/health`;
    const res = await fetch(url, { method: 'GET', signal: ctrl.signal });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

function startPolling() {
  if (pingTimer) return;
  const tick = async () => {
    const ok = await ping();
    notify(ok);
    // Faster polling when offline (5s) so we react quickly to reconnect;
    // slower when online (30s) to save battery / data.
    pingTimer = setTimeout(tick, ok ? 30_000 : 5_000);
  };
  pingTimer = setTimeout(tick, 1_000);
}

startPolling();

export function isOnline(): boolean {
  return currentState;
}

export function subscribeNetwork(cb: NetCb): () => void {
  subscribers.add(cb);
  cb(currentState);
  return () => {
    subscribers.delete(cb);
  };
}
