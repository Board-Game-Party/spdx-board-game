import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutosave } from '../features/evaluation/hooks/useAutosave';
import * as api from '../lib/api';

vi.mock('../lib/api', () => ({
  fetchApi: vi.fn(),
}));

describe('useAutosave hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('accumulates multiple rapid choices and saves all of them in batch without dropping any', async () => {
    const fetchApiMock = vi.mocked(api.fetchApi).mockResolvedValue({ success: true, saved_count: 3 });

    const { result } = renderHook(() => useAutosave(1000));

    act(() => {
      // Rapid clicks across 3 questions within debounce window
      result.current.triggerAutosave('pair-1', 2, 1000);
      result.current.triggerAutosave('pair-2', 4, 1500);
      result.current.triggerAutosave('pair-3', 6, 2000);
    });

    expect(result.current.saveStatus).toBe('saving');
    expect(fetchApiMock).not.toHaveBeenCalled();

    // Fast-forward past the debounce delay
    await act(async () => {
      vi.advanceTimersByTime(1100);
    });

    // Should call batch save with all 3 answers!
    expect(fetchApiMock).toHaveBeenCalledTimes(1);
    expect(fetchApiMock).toHaveBeenCalledWith('/evaluations/draft:batch', {
      method: 'POST',
      body: JSON.stringify({
        drafts: [
          { pair_assignment_id: 'pair-1', choice: 2, time_on_task_ms: 1000 },
          { pair_assignment_id: 'pair-2', choice: 4, time_on_task_ms: 1500 },
          { pair_assignment_id: 'pair-3', choice: 6, time_on_task_ms: 2000 },
        ],
      }),
    });

    expect(result.current.saveStatus).toBe('saved');
  });

  it('calls single draft endpoint when only one question is changed', async () => {
    const fetchApiMock = vi.mocked(api.fetchApi).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useAutosave(1000));

    act(() => {
      result.current.triggerAutosave('pair-single', 3, 500);
    });

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(fetchApiMock).toHaveBeenCalledTimes(1);
    expect(fetchApiMock).toHaveBeenCalledWith('/evaluations/draft', {
      method: 'POST',
      body: JSON.stringify({
        pair_assignment_id: 'pair-single',
        choice: 3,
        time_on_task_ms: 500,
      }),
    });
    expect(result.current.saveStatus).toBe('saved');
  });

  it('flushDrafts immediately saves pending drafts without waiting for timer', async () => {
    const fetchApiMock = vi.mocked(api.fetchApi).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useAutosave(1000));

    act(() => {
      result.current.triggerAutosave('pair-1', 1, 100);
      result.current.triggerAutosave('pair-2', 5, 200);
    });

    expect(fetchApiMock).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.flushDrafts();
    });

    expect(fetchApiMock).toHaveBeenCalledTimes(1);
    expect(fetchApiMock).toHaveBeenCalledWith('/evaluations/draft:batch', {
      method: 'POST',
      body: JSON.stringify({
        drafts: [
          { pair_assignment_id: 'pair-1', choice: 1, time_on_task_ms: 100 },
          { pair_assignment_id: 'pair-2', choice: 5, time_on_task_ms: 200 },
        ],
      }),
    });
  });
});
