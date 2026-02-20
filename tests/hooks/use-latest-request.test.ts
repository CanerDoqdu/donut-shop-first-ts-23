import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLatestRequest } from '@/hooks/use-latest-request';

describe('useLatestRequest', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs a single task successfully', async () => {
    const { result } = renderHook(() => useLatestRequest());
    let capturedSignal: AbortSignal | undefined;

    const taskFn = vi.fn(async (signal: AbortSignal) => {
      capturedSignal = signal;
    });

    act(() => {
      result.current.run(taskFn);
    });

    expect(taskFn).toHaveBeenCalledTimes(1);
    expect(capturedSignal).toBeInstanceOf(AbortSignal);
    expect(capturedSignal!.aborted).toBe(false);
  });

  it('aborts previous request when a new one starts', async () => {
    const { result } = renderHook(() => useLatestRequest());
    const signals: AbortSignal[] = [];

    const task1 = vi.fn(async (signal: AbortSignal) => {
      signals.push(signal);
      // Simulate slow request
      await new Promise((resolve) => setTimeout(resolve, 5000));
    });

    const task2 = vi.fn(async (signal: AbortSignal) => {
      signals.push(signal);
    });

    act(() => {
      result.current.run(task1);
    });

    act(() => {
      result.current.run(task2);
    });

    // First task's signal should be aborted
    expect(signals[0].aborted).toBe(true);
    // Second task's signal should NOT be aborted
    expect(signals[1].aborted).toBe(false);
  });

  it('aborts on manual abort()', async () => {
    const { result } = renderHook(() => useLatestRequest());
    let capturedSignal: AbortSignal | null = null;

    act(() => {
      result.current.run(async (signal) => {
        capturedSignal = signal;
        await new Promise((resolve) => setTimeout(resolve, 5000));
      });
    });

    act(() => {
      result.current.abort();
    });

    expect(capturedSignal!.aborted).toBe(true);
  });

  it('5 rapid clicks: only last request survives', async () => {
    const { result } = renderHook(() => useLatestRequest());
    const signals: AbortSignal[] = [];

    for (let i = 0; i < 5; i++) {
      act(() => {
        result.current.run(async (signal) => {
          signals.push(signal);
          await new Promise((resolve) => setTimeout(resolve, 5000));
        });
      });
    }

    // First 4 should be aborted
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(true);
    expect(signals[2].aborted).toBe(true);
    expect(signals[3].aborted).toBe(true);
    // Last one should survive
    expect(signals[4].aborted).toBe(false);
  });

  it('cleans up on unmount', async () => {
    const { result, unmount } = renderHook(() => useLatestRequest());
    let capturedSignal: AbortSignal | null = null;

    act(() => {
      result.current.run(async (signal) => {
        capturedSignal = signal;
        await new Promise((resolve) => setTimeout(resolve, 10000));
      });
    });

    unmount();

    // Signal should be aborted after unmount (memory leak prevention)
    expect(capturedSignal!.aborted).toBe(true);
  });
});
