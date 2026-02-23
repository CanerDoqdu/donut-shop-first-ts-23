import { describe, it, expect } from 'vitest';
import { routeTag } from '@/components/monitoring/web-vitals';

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
    expect(routeTag('/en/account/settings')).toBe('account');
  });

  it('handles paths without locale prefix', () => {
    expect(routeTag('/products')).toBe('products');
    expect(routeTag('/admin')).toBe('admin');
  });

  it('handles double-slash edge case gracefully', () => {
    expect(routeTag('/en/')).toBe('home');
  });
});
