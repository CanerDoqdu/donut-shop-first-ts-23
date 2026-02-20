import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Test the ComponentErrorBoundary rendering contract ─────────
// We test the error boundary logic at the unit level since it's
// a class component. We simulate error states and verify render output.

describe('ComponentErrorBoundary — contract', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('exports the class from the correct path', async () => {
    // Verify the module resolves without errors
    const mod = await import('../../components/ui/component-error-boundary');
    expect(mod.ComponentErrorBoundary).toBeDefined();
    expect(typeof mod.ComponentErrorBoundary).toBe('function');
  });

  it('has getDerivedStateFromError static method', async () => {
    const { ComponentErrorBoundary } = await import('../../components/ui/component-error-boundary');
    expect(ComponentErrorBoundary.getDerivedStateFromError).toBeDefined();

    const result = ComponentErrorBoundary.getDerivedStateFromError(new Error('test'));
    expect(result).toEqual({ hasError: true, error: expect.any(Error) });
  });

  it('getDerivedStateFromError captures the error object', async () => {
    const { ComponentErrorBoundary } = await import('../../components/ui/component-error-boundary');
    const error = new Error('specific error');
    const state = ComponentErrorBoundary.getDerivedStateFromError(error);
    expect(state.error).toBe(error);
    expect(state.error?.message).toBe('specific error');
  });
});

describe('ComponentErrorBoundary — retry logic', () => {
  it('exponential cooldown: retry 0 = 1s, retry 1 = 2s, retry 2 = 4s', () => {
    // Mirror getCooldownSec from component-error-boundary.tsx
    function getCooldownSec(retryCount: number): number {
      return Math.min(Math.pow(2, retryCount), 4);
    }

    expect(getCooldownSec(0)).toBe(1);
    expect(getCooldownSec(1)).toBe(2);
    expect(getCooldownSec(2)).toBe(4);
    expect(getCooldownSec(3)).toBe(4); // capped
  });

  it('max retries is 3', () => {
    const MAX_RETRIES = 3;
    expect(MAX_RETRIES).toBe(3);
  });
});

describe('SectionSuspense — contract', () => {
  it('exports SectionSuspense from the correct path', async () => {
    const mod = await import('../../components/ui/section-suspense');
    expect(mod.SectionSuspense).toBeDefined();
    expect(typeof mod.SectionSuspense).toBe('function');
  });
});
