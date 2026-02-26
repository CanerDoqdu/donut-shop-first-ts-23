import { describe, it, expect } from 'vitest';
import { isProtectedPath, isAdminPath, detectLocaleFromPath } from '@/lib/middleware';
import type { NextRequest } from 'next/server';

function makeRequest(pathname: string): NextRequest {
  return { nextUrl: { pathname } } as NextRequest;
}

describe('middleware helpers', () => {
  it('detects protected paths across locales', () => {
    expect(isProtectedPath(makeRequest('/en/account'))).toBe(true);
    expect(isProtectedPath(makeRequest('/tr/hesabim'))).toBe(true);
    expect(isProtectedPath(makeRequest('/en/orders/123'))).toBe(true);
    expect(isProtectedPath(makeRequest('/en/public'))).toBe(false);
  });

  it('allows /orders/success as public exception', () => {
    expect(isProtectedPath(makeRequest('/en/orders/success'))).toBe(false);
    expect(isProtectedPath(makeRequest('/tr/siparislerim/success'))).toBe(false);
    // Other order pages remain protected
    expect(isProtectedPath(makeRequest('/en/orders'))).toBe(true);
    expect(isProtectedPath(makeRequest('/en/orders/123'))).toBe(true);
  });

  it('detects admin paths across locales', () => {
    expect(isAdminPath(makeRequest('/en/admin'))).toBe(true);
    expect(isAdminPath(makeRequest('/tr/yonetim/settings'))).toBe(true);
    expect(isAdminPath(makeRequest('/en/account'))).toBe(false);
  });

  it('detects locale from path', () => {
    expect(detectLocaleFromPath('/tr/orders')).toBe('tr');
    expect(detectLocaleFromPath('/en/orders')).toBe('en');
  });
});
