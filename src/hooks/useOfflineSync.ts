import { useEffect, useState } from 'react';
import { subscribeNetwork, isOnline } from '@/services/offline/network';
import { subscribeQueue, getQueueSnapshot } from '@/services/offline/queue';
import type { QueuedMutation } from '@/services/offline/storage';

/**
 * React hook that exposes connection state + queued mutation count.
 * Used by `OfflineBanner` and any screen that needs to show a sync status.
 */
export function useOfflineSync() {
  const [online, setOnline] = useState<boolean>(isOnline());
  const [pending, setPending] = useState<QueuedMutation[]>(getQueueSnapshot());

  useEffect(() => subscribeNetwork(setOnline), []);
  useEffect(() => subscribeQueue(setPending), []);

  return {
    online,
    pending,
    pendingCount: pending.length,
    failedCount: pending.filter((m) => m.attempts >= 6).length,
  };
}
