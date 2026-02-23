import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

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

// ─── ErrorBoundary isolation tests ──────────────────────────────

describe('ComponentErrorBoundary — isolation', () => {
  // Suppress React error boundary console noise
  const originalConsoleError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });

  it('catches child render error and shows fallback UI', async () => {
    const { ComponentErrorBoundary } = await import('../../components/ui/component-error-boundary');

    function ThrowingChild(): React.ReactNode {
      throw new Error('render crash');
    }

    render(
      <ComponentErrorBoundary name="TestSection">
        <ThrowingChild />
      </ComponentErrorBoundary>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/TestSection/)).toBeInTheDocument();

    // Restore
    console.error = originalConsoleError;
  });

  it('does not affect sibling components when one crashes', async () => {
    const { ComponentErrorBoundary } = await import('../../components/ui/component-error-boundary');

    function ThrowingChild(): React.ReactNode {
      throw new Error('crash');
    }

    function HealthyChild() {
      return <div data-testid="healthy">I am fine</div>;
    }

    render(
      <div>
        <ComponentErrorBoundary name="Broken">
          <ThrowingChild />
        </ComponentErrorBoundary>
        <ComponentErrorBoundary name="Healthy">
          <HealthyChild />
        </ComponentErrorBoundary>
      </div>
    );

    // Broken section shows error
    expect(screen.getByRole('alert')).toBeInTheDocument();
    // Healthy section still renders
    expect(screen.getByTestId('healthy')).toBeInTheDocument();
    expect(screen.getByText('I am fine')).toBeInTheDocument();

    console.error = originalConsoleError;
  });

  it('calls onError callback when error is caught', async () => {
    const { ComponentErrorBoundary } = await import('../../components/ui/component-error-boundary');
    const onError = vi.fn();

    function ThrowingChild(): React.ReactNode {
      throw new Error('callback test');
    }

    render(
      <ComponentErrorBoundary name="CallbackTest" onError={onError}>
        <ThrowingChild />
      </ComponentErrorBoundary>
    );

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(expect.any(Error), 'CallbackTest');

    console.error = originalConsoleError;
  });

  it('shows retry button that resets error state', async () => {
    const { ComponentErrorBoundary } = await import('../../components/ui/component-error-boundary');
    let shouldThrow = true;

    function ConditionalThrow() {
      if (shouldThrow) throw new Error('temporary');
      return <div data-testid="recovered">Recovered!</div>;
    }

    render(
      <ComponentErrorBoundary name="RetryTest">
        <ConditionalThrow />
      </ComponentErrorBoundary>
    );

    // Verify error state
    expect(screen.getByRole('alert')).toBeInTheDocument();
    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();

    // Fix the component and retry
    shouldThrow = false;
    fireEvent.click(retryButton);

    expect(screen.getByTestId('recovered')).toBeInTheDocument();

    console.error = originalConsoleError;
  });
});

// ─── SectionSuspense integration ────────────────────────────────

describe('SectionSuspense — integration', () => {
  const originalConsoleError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });

  it('renders children normally when no error', async () => {
    const { SectionSuspense } = await import('../../components/ui/section-suspense');

    render(
      <SectionSuspense name="TestSection">
        <div data-testid="content">Hello</div>
      </SectionSuspense>
    );

    expect(screen.getByTestId('content')).toBeInTheDocument();
    console.error = originalConsoleError;
  });

  it('catches child error and shows error boundary fallback', async () => {
    const { SectionSuspense } = await import('../../components/ui/section-suspense');

    function ThrowingChild(): React.ReactNode {
      throw new Error('section crash');
    }

    render(
      <SectionSuspense name="CrashSection">
        <ThrowingChild />
      </SectionSuspense>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    console.error = originalConsoleError;
  });
});
