import { describe, it, expect, vi, beforeEach } from 'vitest';
import { captureWithContext, setSentryUser, clearSentryUser, addBreadcrumb, addCorrelatedBreadcrumb } from '@/lib/sentry';

// ─── Mock @sentry/nextjs ────────────────────────────────────

const mockCaptureException = vi.fn();
const mockCaptureMessage = vi.fn();
const mockSetUser = vi.fn();
const mockAddBreadcrumb = vi.fn();
const mockWithScope = vi.fn((callback: (scope: unknown) => void) => {
  const scope = {
    setTag: vi.fn(),
    setLevel: vi.fn(),
    setExtras: vi.fn(),
  };
  callback(scope);
  return scope;
});

vi.mock('@sentry/nextjs', () => ({
  withScope: (...args: unknown[]) => mockWithScope(...args as [callback: (scope: unknown) => void]),
  captureException: (...args: unknown[]) => mockCaptureException(...args),
  captureMessage: (...args: unknown[]) => mockCaptureMessage(...args),
  setUser: (...args: unknown[]) => mockSetUser(...args),
  addBreadcrumb: (...args: unknown[]) => mockAddBreadcrumb(...args),
}));

// ─── Tests ──────────────────────────────────────────────────

describe('Sentry helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('captureWithContext', () => {
    it('captures Error instances with domain tag and extras', () => {
      const error = new Error('checkout failed');
      captureWithContext(error, 'checkout', { orderId: 'ord-123' });

      expect(mockWithScope).toHaveBeenCalledOnce();
      expect(mockCaptureException).toHaveBeenCalledWith(error);
    });

    it('captures non-Error values as messages', () => {
      captureWithContext('string error', 'webhook', { eventId: 'evt_1' });

      expect(mockCaptureMessage).toHaveBeenCalledWith('string error', 'error');
    });

    it('sets domain tag on scope', () => {
      const error = new Error('test');
      captureWithContext(error, 'email', {});

      const scopeCallback = mockWithScope.mock.calls[0][0];
      const mockScope = { setTag: vi.fn(), setLevel: vi.fn(), setExtras: vi.fn() };
      scopeCallback(mockScope);

      expect(mockScope.setTag).toHaveBeenCalledWith('domain', 'email');
    });

    it('supports custom severity level', () => {
      captureWithContext(new Error('warning'), 'search', {}, 'warning');

      const scopeCallback = mockWithScope.mock.calls[0][0];
      const mockScope = { setTag: vi.fn(), setLevel: vi.fn(), setExtras: vi.fn() };
      scopeCallback(mockScope);

      expect(mockScope.setLevel).toHaveBeenCalledWith('warning');
    });

    it('attaches extra context to scope (including classification)', () => {
      captureWithContext(new Error('x'), 'inventory', { productId: 'p-1', stock: 0 });

      const scopeCallback = mockWithScope.mock.calls[0][0];
      const mockScope = { setTag: vi.fn(), setLevel: vi.fn(), setExtras: vi.fn() };
      scopeCallback(mockScope);

      const extrasCall = mockScope.setExtras.mock.calls[0][0];
      expect(extrasCall.productId).toBe('p-1');
      expect(extrasCall.stock).toBe(0);
      expect(extrasCall['error.bucket']).toBeDefined();
      expect(extrasCall['error.retryable']).toBeDefined();
    });
  });

  describe('setSentryUser', () => {
    it('sets user context with id and email', () => {
      setSentryUser({ id: 'user-1', email: 'test@example.com' });
      expect(mockSetUser).toHaveBeenCalledWith({ id: 'user-1', email: 'test@example.com' });
    });
  });

  describe('clearSentryUser', () => {
    it('clears user context by setting null', () => {
      clearSentryUser();
      expect(mockSetUser).toHaveBeenCalledWith(null);
    });
  });

  describe('addBreadcrumb', () => {
    it('adds a breadcrumb with category, message, and data', () => {
      addBreadcrumb('navigation', 'User clicked checkout', { cartSize: 3 });
      expect(mockAddBreadcrumb).toHaveBeenCalledWith({
        category: 'navigation',
        message: 'User clicked checkout',
        data: { cartSize: 3 },
        level: 'info',
      });
    });
  });

  // ── Enhanced captureWithContext (PR28) ─────────────────────

  describe('captureWithContext — error classification tags', () => {
    it('adds error.bucket and error.retryable tags', () => {
      const error = Object.assign(new Error('rate limited'), { code: 'E_RATE_LIMITED', status: 429 });
      captureWithContext(error, 'auth', {});

      const scopeCallback = mockWithScope.mock.calls[0][0];
      const mockScope = { setTag: vi.fn(), setLevel: vi.fn(), setExtras: vi.fn() };
      scopeCallback(mockScope);

      expect(mockScope.setTag).toHaveBeenCalledWith('error.bucket', 'operational');
      expect(mockScope.setTag).toHaveBeenCalledWith('error.retryable', 'true');
    });

    it('auto-classifies severity when not explicitly provided', () => {
      const error = new TypeError('Cannot read property');
      captureWithContext(error, 'checkout', {});

      const scopeCallback = mockWithScope.mock.calls[0][0];
      const mockScope = { setTag: vi.fn(), setLevel: vi.fn(), setExtras: vi.fn() };
      scopeCallback(mockScope);

      // TypeError → programmer → error severity
      expect(mockScope.setLevel).toHaveBeenCalledWith('error');
    });
  });

  describe('captureWithContext — extended options', () => {
    it('attaches requestId and correlationId as tags', () => {
      captureWithContext(new Error('fail'), 'checkout', { orderId: 'ord-1' }, {
        requestId: 'req-abc',
        correlationId: 'corr-xyz',
      });

      const scopeCallback = mockWithScope.mock.calls[0][0];
      const mockScope = { setTag: vi.fn(), setLevel: vi.fn(), setExtras: vi.fn() };
      scopeCallback(mockScope);

      expect(mockScope.setTag).toHaveBeenCalledWith('requestId', 'req-abc');
      expect(mockScope.setTag).toHaveBeenCalledWith('correlationId', 'corr-xyz');
    });

    it('includes classification in extras', () => {
      captureWithContext(new Error('x'), 'webhook', {}, {
        requestId: 'req-1',
      });

      const scopeCallback = mockWithScope.mock.calls[0][0];
      const mockScope = { setTag: vi.fn(), setLevel: vi.fn(), setExtras: vi.fn() };
      scopeCallback(mockScope);

      const extrasCall = mockScope.setExtras.mock.calls[0][0];
      expect(extrasCall['error.bucket']).toBeDefined();
      expect(extrasCall['error.retryable']).toBeDefined();
      expect(extrasCall.requestId).toBe('req-1');
    });

    it('accepts custom classification override', () => {
      captureWithContext(new Error('x'), 'checkout', {}, {
        classification: { bucket: 'infrastructure', retryable: true, severity: 'fatal' },
      });

      const scopeCallback = mockWithScope.mock.calls[0][0];
      const mockScope = { setTag: vi.fn(), setLevel: vi.fn(), setExtras: vi.fn() };
      scopeCallback(mockScope);

      expect(mockScope.setTag).toHaveBeenCalledWith('error.bucket', 'infrastructure');
      expect(mockScope.setLevel).toHaveBeenCalledWith('fatal');
    });

    it('remains backward compatible with string level', () => {
      captureWithContext(new Error('x'), 'email', {}, 'warning');
      expect(mockCaptureException).toHaveBeenCalled();
    });

    it('maps fatal severity via mapSeverity when no explicit level', () => {
      captureWithContext(new Error('x'), 'checkout', {}, {
        classification: { bucket: 'infrastructure', retryable: false, severity: 'fatal' },
      });

      const scopeCallback = mockWithScope.mock.calls[0][0];
      const mockScope = { setTag: vi.fn(), setLevel: vi.fn(), setExtras: vi.fn() };
      scopeCallback(mockScope);

      // mapSeverity('fatal') → 'fatal'
      expect(mockScope.setLevel).toHaveBeenCalledWith('fatal');
    });

    it('maps info severity via mapSeverity', () => {
      captureWithContext(new Error('x'), 'checkout', {}, {
        classification: { bucket: 'operational', retryable: true, severity: 'info' },
      });

      const scopeCallback = mockWithScope.mock.calls[0][0];
      const mockScope = { setTag: vi.fn(), setLevel: vi.fn(), setExtras: vi.fn() };
      scopeCallback(mockScope);

      expect(mockScope.setLevel).toHaveBeenCalledWith('info');
    });
  });

  // ── addCorrelatedBreadcrumb ───────────────────────────────

  describe('addCorrelatedBreadcrumb', () => {
    it('adds breadcrumb with requestId and correlationId', () => {
      addCorrelatedBreadcrumb('http', 'POST /api/checkout', {
        requestId: 'req-1',
        correlationId: 'corr-1',
        data: { status: 200 },
      });

      expect(mockAddBreadcrumb).toHaveBeenCalledWith({
        category: 'http',
        message: 'POST /api/checkout',
        data: {
          status: 200,
          requestId: 'req-1',
          correlationId: 'corr-1',
        },
        level: 'info',
      });
    });

    it('works without optional fields', () => {
      addCorrelatedBreadcrumb('navigation', 'page load');

      expect(mockAddBreadcrumb).toHaveBeenCalledWith({
        category: 'navigation',
        message: 'page load',
        data: {},
        level: 'info',
      });
    });
  });
});
