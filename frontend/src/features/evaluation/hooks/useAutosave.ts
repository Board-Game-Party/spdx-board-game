import { useRef, useCallback, useState, useEffect } from 'react';
import { fetchApi } from '../../../lib/api';

export interface DraftItem {
  pair_assignment_id: string;
  choice: number;
  time_on_task_ms: number;
}

export function useAutosave(delayMs: number = 1000) {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'offline'>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDraftsRef = useRef<Map<string, { choice: number; timeOnTaskMs: number }>>(new Map());

  const flushDrafts = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (pendingDraftsRef.current.size === 0) {
      return;
    }

    const draftsToSave: DraftItem[] = Array.from(pendingDraftsRef.current.entries()).map(
      ([pair_assignment_id, data]) => ({
        pair_assignment_id,
        choice: data.choice,
        time_on_task_ms: data.timeOnTaskMs,
      })
    );
    pendingDraftsRef.current.clear();

    try {
      if (!navigator.onLine) {
        const queueStr = localStorage.getItem('paireval_offline_queue') || '[]';
        const queue: DraftItem[] = JSON.parse(queueStr);
        queue.push(...draftsToSave);
        localStorage.setItem('paireval_offline_queue', JSON.stringify(queue));
        setSaveStatus('offline');
        return;
      }

      if (draftsToSave.length === 1) {
        await fetchApi('/evaluations/draft', {
          method: 'POST',
          body: JSON.stringify(draftsToSave[0]),
        });
      } else {
        await fetchApi('/evaluations/draft:batch', {
          method: 'POST',
          body: JSON.stringify({ drafts: draftsToSave }),
        });
      }

      const now = new Date();
      const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      setLastSavedTime(timeStr);
      setSaveStatus('saved');
    } catch {
      try {
        const queueStr = localStorage.getItem('paireval_offline_queue') || '[]';
        const queue: DraftItem[] = JSON.parse(queueStr);
        queue.push(...draftsToSave);
        localStorage.setItem('paireval_offline_queue', JSON.stringify(queue));
      } catch {
        // ignore storage errors
      }
      setSaveStatus('offline');
    }
  }, []);

  const triggerAutosave = useCallback(
    (pairAssignmentId: string, choice: number, timeOnTaskMs: number = 0) => {
      pendingDraftsRef.current.set(pairAssignmentId, { choice, timeOnTaskMs });
      setSaveStatus('saving');

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        flushDrafts();
      }, delayMs);
    },
    [delayMs, flushDrafts]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (pendingDraftsRef.current.size > 0) {
        flushDrafts();
      }
    };
  }, [flushDrafts]);

  return { saveStatus, lastSavedTime, triggerAutosave, flushDrafts };
}
