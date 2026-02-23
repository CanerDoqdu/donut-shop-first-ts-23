import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Verify that heavy components on the home page are loaded via next/dynamic
 * rather than static imports.  This is a source-level regression guard.
 */

function readComponent(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf-8');
}

describe('Home page dynamic imports', () => {
  const src = readComponent('app/[locale]/page.tsx');

  it('imports next/dynamic', () => {
    expect(src).toContain("import dynamic from 'next/dynamic'");
  });

  it('lazy-loads SprinkleRain with ssr: false', () => {
    expect(src).toContain("import('@/components/ui/sprinkle-rain')");
    expect(src).toContain('ssr: false');
  });

  it('lazy-loads FadeIn via dynamic()', () => {
    expect(src).toContain("import('@/components/ui/animations').then((m) => m.FadeIn)");
  });

  it('lazy-loads StaggerContainer via dynamic()', () => {
    expect(src).toContain("import('@/components/ui/animations').then((m) => m.StaggerContainer)");
  });

  it('lazy-loads StaggerItem via dynamic()', () => {
    expect(src).toContain("import('@/components/ui/animations').then((m) => m.StaggerItem)");
  });

  it('lazy-loads FloatingElement via dynamic()', () => {
    expect(src).toContain("import('@/components/ui/animations').then((m) => m.FloatingElement)");
  });

  it('does NOT have direct static import of SprinkleRain', () => {
    // Make sure the old static import is gone
    expect(src).not.toContain("import { SprinkleRain } from '@/components/ui/sprinkle-rain'");
  });

  it('does NOT have direct static import of animation components', () => {
    expect(src).not.toMatch(/import\s*\{[^}]*FadeIn[^}]*\}\s*from\s*'@\/components\/ui\/animations'/);
  });
});

describe('AddToCartButton memo', () => {
  const src = readComponent('components/ui/add-to-cart-button.tsx');

  it('uses React.memo wrapper', () => {
    expect(src).toContain('memo(function AddToCartButton');
  });

  it('imports memo from react', () => {
    expect(src).toContain("import { memo } from 'react'");
  });
});

// ─── Header: ThemeToggle dynamic import ──────────────────────

describe('Header ThemeToggle dynamic import', () => {
  const src = readComponent('components/layout/header.tsx');

  it('imports next/dynamic', () => {
    expect(src).toContain("import dynamic from 'next/dynamic'");
  });

  it('lazy-loads ThemeToggle with ssr: false', () => {
    expect(src).toContain("import('@/components/theme/theme-toggle')");
    expect(src).toContain('ssr: false');
  });

  it('does NOT have direct static import of ThemeToggle', () => {
    expect(src).not.toContain("import { ThemeToggle } from '@/components/theme/theme-toggle'");
  });
});

// ─── Admin: AdminDashboard dynamic import ────────────────────

describe('Admin dashboard dynamic import', () => {
  const src = readComponent('app/[locale]/admin/page.tsx');

  it('imports next/dynamic', () => {
    expect(src).toContain("import dynamic from 'next/dynamic'");
  });

  it('lazy-loads AdminDashboard with ssr: false', () => {
    expect(src).toContain("import('@/components/admin/AdminDashboard')");
    expect(src).toContain('ssr: false');
  });

  it('does NOT have direct static import of AdminDashboard', () => {
    expect(src).not.toContain("import AdminDashboard from '@/components/admin/AdminDashboard'");
  });
});

// ─── Memoised components ─────────────────────────────────────

describe('ProductCard memo', () => {
  const src = readComponent('components/ui/product-card.tsx');

  it('uses React.memo wrapper', () => {
    expect(src).toContain('memo(function ProductCard');
  });

  it('imports memo from react', () => {
    expect(src).toContain("import { memo");
  });
});

describe('CartItemRow memo', () => {
  const src = readComponent('components/ui/cart-item-row.tsx');

  it('uses React.memo wrapper', () => {
    expect(src).toContain('memo(function CartItemRow');
  });

  it('imports memo from react', () => {
    expect(src).toContain("import { memo } from 'react'");
  });
});

describe('OrderRow memo', () => {
  const src = readComponent('components/ui/order-row.tsx');

  it('uses React.memo wrapper', () => {
    expect(src).toContain('memo(function OrderRow');
  });

  it('imports memo from react', () => {
    expect(src).toContain("import { memo } from 'react'");
  });
});
