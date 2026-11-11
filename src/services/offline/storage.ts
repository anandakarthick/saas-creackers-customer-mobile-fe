import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Tiny AsyncStorage-backed mutation queue for the mobile app.
 *
 * AsyncStorage is keyed-value only, so we serialise the queue as one JSON
 * blob under a fixed key. For the volume of mutations a POS device generates
 * (a few hundred max per day), this is fine — the rewrite cost is microscopic.
 *
 * Mirrors the web `lib/offline/storage.ts` shape so app code can use the
 * same queue-runner behaviour on both platforms.
 */

const QUEUE_KEY = '@saas/offline-queue';

export interface QueuedMutation {
  id: string;                          // uuid — used as Idempotency-Key on the wire
  url: string;                         // request path (e.g. /admin/pos/sales)
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body: any;                           // JSON body
  headers?: Record<string, string>;    // extra headers (auth added at replay)
  createdAt: number;                   // Date.now() at enqueue
  attempts: number;                    // sync attempts so far
  lastError?: string;                  // last failure message (for UI)
  label?: string;                      // human-readable label ("POS sale ₹450")
}

async function readAll(): Promise<QueuedMutation[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(queue: QueuedMutation[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function putMutation(m: QueuedMutation): Promise<void> {
  const queue = await readAll();
  const idx = queue.findIndex((x) => x.id === m.id);
  if (idx >= 0) queue[idx] = m;
  else queue.push(m);
  await writeAll(queue);
}

export async function getAllMutations(): Promise<QueuedMutation[]> {
  const queue = await readAll();
  return [...queue].sort((a, b) => a.createdAt - b.createdAt);
}

export async function deleteMutation(id: string): Promise<void> {
  const queue = await readAll();
  const next = queue.filter((m) => m.id !== id);
  await writeAll(next);
}

export async function clearAllMutations(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}
