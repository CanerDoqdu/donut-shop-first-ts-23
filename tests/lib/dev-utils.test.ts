/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

function seedStorage() {
  localStorage.setItem('donut-cart-storage', 'cart');
  sessionStorage.setItem('donut-checkout-machine', 'checkout');
  localStorage.setItem('sb-test', 'token');
  localStorage.setItem('auth-token', 'token');
  sessionStorage.setItem('misc', 'value');
}

describe('devUtils', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it('clearAllCaches removes cart, checkout, auth tokens, and session storage', async () => {
    seedStorage();
    const { devUtils } = await import('@/lib/dev-utils');

    devUtils.clearAllCaches();

    expect(localStorage.getItem('donut-cart-storage')).toBeNull();
    expect(sessionStorage.getItem('donut-checkout-machine')).toBeNull();
    expect(localStorage.getItem('sb-test')).toBeNull();
    expect(localStorage.getItem('auth-token')).toBeNull();
    expect(sessionStorage.getItem('misc')).toBeNull();
  });

  it('clearCartCache only removes cart storage', async () => {
    seedStorage();
    const { devUtils } = await import('@/lib/dev-utils');

    devUtils.clearCartCache();

    expect(localStorage.getItem('donut-cart-storage')).toBeNull();
    expect(localStorage.getItem('sb-test')).toBe('token');
  });

  it('clearAuthCache removes auth tokens only', async () => {
    seedStorage();
    const { devUtils } = await import('@/lib/dev-utils');

    devUtils.clearAuthCache();

    expect(localStorage.getItem('sb-test')).toBeNull();
    expect(localStorage.getItem('auth-token')).toBeNull();
    expect(localStorage.getItem('donut-cart-storage')).toBe('cart');
  });

  it('showCaches logs storage contents', async () => {
    seedStorage();
    const { devUtils } = await import('@/lib/dev-utils');

    devUtils.showCaches();

    expect(logSpy).toHaveBeenCalled();
  });

  it('exposes window.__dev in development', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.resetModules();
    await import('@/lib/dev-utils');

    expect((window as Window & { __dev?: unknown }).__dev).toBeDefined();
  });
});
