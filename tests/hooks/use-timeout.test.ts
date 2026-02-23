import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTimeout } from '@/hooks/use-timeout';

describe('useTimeout', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls callback after delay', () => {
    vi.useFakeTimers();
    const callback = vi.fn();

    const { result } = renderHook(() => useTimeout());

    act(() => {
      result.current.set(callback, 1000);
    });

    expect(callback).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('clears previous timeout when set is called again', () => {
    vi.useFakeTimers();
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    const { result } = renderHook(() => useTimeout());

    act(() => {
      result.current.set(callback1, 1000);
    });

    // Override with new timeout before first fires
    act(() => {
      result.current.set(callback2, 500);
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).toHaveBeenCalledTimes(1);
  });

  it('cancels timeout on unmount (prevents setState-after-unmount)', () => {
    vi.useFakeTimers();
    const callback = vi.fn();

    const { result, unmount } = renderHook(() => useTimeout());

    act(() => {
      result.current.set(callback, 2000);
    });

    // Unmount before timeout fires
    unmount();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Should NOT have been called — timer was cleared on unmount
    expect(callback).not.toHaveBeenCalled();
  });

  it('clear() cancels a pending timeout', () => {
    vi.useFakeTimers();
    const callback = vi.fn();

    const { result } = renderHook(() => useTimeout());

    act(() => {
      result.current.set(callback, 1000);
    });

    act(() => {
      result.current.clear();
    });

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('clear() is safe to call with no pending timeout', () => {
    const { result } = renderHook(() => useTimeout());

    // Should not throw
    act(() => {
      result.current.clear();
    });
  });

  it('allows new timeout after clear()', () => {
    vi.useFakeTimers();
    const callback = vi.fn();

    const { result } = renderHook(() => useTimeout());

    act(() => {
      result.current.set(callback, 1000);
      result.current.clear();
    });

    act(() => {
      result.current.set(callback, 500);
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('resets internal ref after timeout fires', () => {
    vi.useFakeTimers();
    const callback = vi.fn();

    const { result } = renderHook(() => useTimeout());

    act(() => {
      result.current.set(callback, 100);
    });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(callback).toHaveBeenCalledTimes(1);

    // clear() after firing should be safe (ref already undefined)
    act(() => {
      result.current.clear();
    });
  });
});
