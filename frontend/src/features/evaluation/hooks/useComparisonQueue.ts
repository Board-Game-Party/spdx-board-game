import { useEffect, useCallback } from 'react';
import { fetchApi } from '../../../lib/api';

export function useComparisonQueue(onSynced?: () => void) {
  const syncOfflineQueue = useCallback(async () => {
    const queueStr = localStorage.getItem('paireval_offline_queue');
    if (!queueStr) return;

    try {
      const queue = JSON.parse(queueStr);
      if (queue.length === 0) return;

      await fetchApi('/evaluations/draft:batch', {
        method: 'POST',
        body: JSON.stringify({ drafts: queue }),
      });

      localStorage.removeItem('paireval_offline_queue');
      if (onSynced) onSynced();
    } catch {
      // keep in queue until next online event
    }
  }, [onSynced]);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      syncOfflineQueue();
    }
    window.addEventListener('online', syncOfflineQueue);
    return () => window.removeEventListener('online', syncOfflineQueue);
  }, [syncOfflineQueue]);

  return { syncOfflineQueue };
}
