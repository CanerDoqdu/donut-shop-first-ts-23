/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { routeTag } from '@/components/monitoring/web-vitals';

// ── Mock Next.js hooks before importing the component ────────
const mockUsePathname = vi.fn(() => '/en/checkout');
let capturedReporter: ((metric: Record<string, unknown>) => void) | null = null;

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

vi.mock('next/web-vitals', () => ({
  useReportWebVitals: (fn: (metric: Record<string, unknown>) => void) => {
    capturedReporter = fn;
  },
}));

// Must import after mocks are set up
import { WebVitals } from '@/components/monitoring/web-vitals';
import { renderHook } from '@testing-library/react';

// ── routeTag (pure function) ─────────────────────────────────
describe('routeTag', () => {
  it('maps root locale path to "home"', () => {
    expect(routeTag('/en')).toBe('home');
    expect(routeTag('/tr')).toBe('home');
  });

  it('maps bare "/" to "home"', () => {
    expect(routeTag('/')).toBe('home');
  });

  it('extracts first segment after locale', () => {
    expect(routeTag('/en/products')).toBe('products');
    expect(routeTag('/tr/checkout')).toBe('checkout');
    expect(routeTag('/en/admin/orders')).toBe('admin');
    expect(routeTag('/tr/stores/istanbul')).toBe('stores');
  });

  it('handles paths without locale prefix', () => {
    expect(routeTag('/products')).toBe('products');
    expect(routeTag('/admin')).toBe('admin');
  });

  it('handles trailing slash after locale', () => {
    expect(routeTag('/en/')).toBe('home');
  });

  it('returns home when segment is undefined (nullish coalesce)', () => {
    // Empty string after locale strip → split produces empty array → [0] is undefined
    expect(routeTag('')).toBe('home');
  });
});

// ── WebVitals component ──────────────────────────────────────
describe('WebVitals component', () => {
  let sendBeaconSpy: ReturnType<typeof vi.fn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    capturedReporter = null;
    sendBeaconSpy = vi.fn(() => true);
    Object.defineProperty(navigator, 'sendBeacon', {
      value: sendBeaconSpy,
      writable: true,
      configurable: true,
    });
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockUsePathname.mockReturnValue('/en/checkout');
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it('returns null (no visible UI)', () => {
    const { result } = renderHook(() => WebVitals());
    expect(result.current).toBeNull();
  });

  it('registers a reporter via useReportWebVitals', () => {
    renderHook(() => WebVitals());
    expect(capturedReporter).toBeInstanceOf(Function);
  });

  it('sends beacon to /api/vitals when metric reported', () => {
    renderHook(() => WebVitals());
    expect(capturedReporter).not.toBeNull();

    capturedReporter!({
      name: 'LCP',
      value: 2100,
      rating: 'needs-improvement',
      id: 'v1-123',
      navigationType: 'navigate',
      delta: 2100,
    });

    expect(sendBeaconSpy).toHaveBeenCalledWith(
      '/api/vitals',
      expect.stringContaining('"name":"LCP"'),
    );

    // Verify route tag is included
    const payload = JSON.parse(sendBeaconSpy.mock.calls[0][1] as string);
    expect(payload.route).toBe('checkout');
    expect(payload.value).toBe(2100);
  });

  it('includes route context derived from pathname', () => {
    mockUsePathname.mockReturnValue('/tr/admin/orders');
    renderHook(() => WebVitals());

    capturedReporter!({
      name: 'CLS',
      value: 0.05,
      rating: 'good',
      id: 'v1-456',
      navigationType: 'navigate',
      delta: 0.05,
    });

    const payload = JSON.parse(sendBeaconSpy.mock.calls[0][1] as string);
    expect(payload.route).toBe('admin');
  });

  it('logs to console in development with color-coded severity', () => {
    const originalEnv = process.env.NODE_ENV;
    // Force development mode
    vi.stubEnv('NODE_ENV', 'development');

    renderHook(() => WebVitals());

    // Good LCP (< 2500)
    capturedReporter!({
      name: 'LCP',
      value: 1500,
      rating: 'good',
      id: 'v1-789',
      navigationType: 'navigate',
      delta: 1500,
    });

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('🟢'),
    );

    // Poor LCP (> 4000)
    capturedReporter!({
      name: 'LCP',
      value: 5000,
      rating: 'poor',
      id: 'v1-abc',
      navigationType: 'navigate',
      delta: 5000,
    });

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('🔴'),
    );

    vi.stubEnv('NODE_ENV', originalEnv ?? 'test');
  });

  it('shows yellow icon for needs-improvement rating', () => {
    vi.stubEnv('NODE_ENV', 'development');

    renderHook(() => WebVitals());

    // LCP between 2500 and 4000 → yellow
    capturedReporter!({
      name: 'LCP',
      value: 3000,
      rating: 'needs-improvement',
      id: 'v1-ni1',
      navigationType: 'navigate',
      delta: 3000,
    });

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('🟡'),
    );
  });

  it('handles metric without known threshold gracefully', () => {
    vi.stubEnv('NODE_ENV', 'development');

    renderHook(() => WebVitals());

    // Unknown metric — should default to green (Infinity thresholds)
    capturedReporter!({
      name: 'CUSTOM_METRIC',
      value: 999999,
      rating: undefined,
      id: 'v1-custom',
      navigationType: 'navigate',
      delta: 999999,
    });

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('🟢'),
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('n/a'),
    );
  });

  it('does not crash when navigator.sendBeacon is unavailable', () => {
    // Remove sendBeacon to test the typeof guard
    Object.defineProperty(navigator, 'sendBeacon', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    renderHook(() => WebVitals());

    expect(() => {
      capturedReporter!({
        name: 'LCP',
        value: 2000,
        rating: 'good',
        id: 'v1-no-beacon',
        navigationType: 'navigate',
        delta: 2000,
      });
    }).not.toThrow();
  });
});
