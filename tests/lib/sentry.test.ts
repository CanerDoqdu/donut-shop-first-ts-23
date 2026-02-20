import { describe, it, expect, vi, beforeEach } from 'vitest';
import { captureWithContext, setSentryUser, clearSentryUser, addBreadcrumb } from '@/lib/sentry';

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

    it('attaches extra context to scope', () => {
      captureWithContext(new Error('x'), 'inventory', { productId: 'p-1', stock: 0 });

      const scopeCallback = mockWithScope.mock.calls[0][0];
      const mockScope = { setTag: vi.fn(), setLevel: vi.fn(), setExtras: vi.fn() };
      scopeCallback(mockScope);

      expect(mockScope.setExtras).toHaveBeenCalledWith({ productId: 'p-1', stock: 0 });
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
});
