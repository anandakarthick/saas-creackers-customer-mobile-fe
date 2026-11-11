import apiClient from '@/services/api/client';
import { putMutation, getAllMutations, deleteMutation, type QueuedMutation } from './storage';
import { isOnline, subscribeNetwork } from './network';

/**
 * Mobile offline mutation queue.
 *
 * Behaviourally identical to the web queue (`saas-creackers-fe/src/lib/offline/queue.ts`):
 * persist mutations when offline / on network failure, replay through the
 * shared apiClient when connectivity returns, attach `Idempotency-Key` so
 * the backend dedupes if the original response was lost in flight.
 *
 * Subscribers receive the current queue snapshot whenever it changes —
 * used by the OfflineBanner UI to show pending count.
 */

const MAX_ATTEMPTS = 6;

type QueueCb = (mutations: QueuedMutation[]) => void;
const subscribers = new Set<QueueCb>();
let cachedQueue: QueuedMutation[] = [];
let syncing = false;

async function refresh(): Promise<void> {
  cachedQueue = await getAllMutations();
  subscribers.forEach((cb) => cb(cachedQueue));
}

export function subscribeQueue(cb: QueueCb): () => void {
  subscribers.add(cb);
  cb(cachedQueue);
  return () => {
    subscribers.delete(cb);
  };
}

export function getQueueSnapshot(): QueuedMutation[] {
  return cachedQueue;
}

function uuid(): string {
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

interface EnqueueArgs {
  url: string;
  method: QueuedMutation['method'];
  body: any;
  label?: string;
  headers?: Record<string, string>;
}

export async function enqueueMutation(args: EnqueueArgs): Promise<QueuedMutation> {
  const m: QueuedMutation = {
    id: uuid(),
    url: args.url,
    method: args.method,
    body: args.body,
    headers: args.headers,
    label: args.label,
    createdAt: Date.now(),
    attempts: 0,
  };
  await putMutation(m);
  await refresh();
  if (isOnline()) void runSync();
  return m;
}

export async function runSync(): Promise<number> {
  if (syncing) return 0;
  if (!isOnline()) return 0;
  syncing = true;
  let synced = 0;
  try {
    const queue = await getAllMutations();
    for (const m of queue) {
      if (m.attempts >= MAX_ATTEMPTS) continue;
      try {
        const headers = {
          ...(m.headers || {}),
          'Idempotency-Key': m.id,
        };
        await apiClient.request({
          url: m.url,
          method: m.method,
          data: m.body,
          headers,
        });
        await deleteMutation(m.id);
        synced++;
      } catch (err: any) {
        const status = err?.response?.status;
        const isClientError = status >= 400 && status < 500;
        const next: QueuedMutation = {
          ...m,
          attempts: isClientError ? MAX_ATTEMPTS : m.attempts + 1,
          lastError: err?.response?.data?.message || err?.message || 'Sync failed',
        };
        await putMutation(next);
        if (!isClientError && (!err?.response || err?.code === 'ERR_NETWORK')) break;
      }
    }
  } finally {
    syncing = false;
    await refresh();
  }
  return synced;
}

export async function retryMutation(id: string): Promise<void> {
  const all = await getAllMutations();
  const m = all.find((x) => x.id === id);
  if (!m) return;
  await putMutation({ ...m, attempts: 0, lastError: undefined });
  await refresh();
  void runSync();
}

export async function discardMutation(id: string): Promise<void> {
  await deleteMutation(id);
  await refresh();
}

let runnerStarted = false;
export function startSyncRunner(): void {
  if (runnerStarted) return;
  runnerStarted = true;
  void refresh();
  subscribeNetwork((online) => {
    if (online) void runSync();
  });
  // Safety-net poll every 60s.
  setInterval(() => {
    if (isOnline()) void runSync();
  }, 60_000);
}
