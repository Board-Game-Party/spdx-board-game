import { useRef, useCallback, useState } from 'react';
import { fetchApi } from '../../../lib/api';

export function useAutosave(delayMs: number = 1000) {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'offline'>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerAutosave = useCallback(
    (pairAssignmentId: string, choice: number, timeOnTaskMs: number = 0) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      setSaveStatus('saving');

      timeoutRef.current = setTimeout(async () => {
        try {
          if (!navigator.onLine) {
            const queueStr = localStorage.getItem('paireval_offline_queue') || '[]';
            const queue = JSON.parse(queueStr);
            queue.push({ pair_assignment_id: pairAssignmentId, choice, time_on_task_ms: timeOnTaskMs });
            localStorage.setItem('paireval_offline_queue', JSON.stringify(queue));
            setSaveStatus('offline');
            return;
          }

          await fetchApi('/evaluations/draft', {
            method: 'POST',
            body: JSON.stringify({
              pair_assignment_id: pairAssignmentId,
              choice,
              time_on_task_ms: timeOnTaskMs,
            }),
          });

          const now = new Date();
          const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
          setLastSavedTime(timeStr);
          setSaveStatus('saved');
        } catch {
          setSaveStatus('offline');
        }
      }, delayMs);
    },
    [delayMs]
  );

  return { saveStatus, lastSavedTime, triggerAutosave };
}
