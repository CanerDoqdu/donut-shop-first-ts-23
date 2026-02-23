import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Static accessibility audit — verifies that key ARIA attributes are present
 * in the rendered component source.  This catches regressions without needing
 * a browser runtime.
 */

function readComponent(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf-8');
}

// ─── Header ARIA ────────────────────────────────────────────

describe('Header accessibility', () => {
  const src = readComponent('components/layout/header.tsx');

  it('has aria-label on main navigation', () => {
    expect(src).toContain('aria-label="Main navigation"');
  });

  it('has aria-label on mobile navigation', () => {
    expect(src).toContain('aria-label="Mobile navigation"');
  });

  it('has aria-expanded on "More" dropdown', () => {
    expect(src).toContain('aria-expanded={moreMenuOpen}');
  });

  it('has aria-expanded on user menu', () => {
    expect(src).toContain('aria-expanded={userMenuOpen}');
  });

  it('has aria-expanded on mobile menu button', () => {
    expect(src).toContain('aria-expanded={mobileMenuOpen}');
  });

  it('has aria-haspopup on dropdown buttons', () => {
    expect(src).toContain('aria-haspopup="true"');
  });

  it('has role="menu" on dropdown panels', () => {
    expect(src).toContain('role="menu"');
  });

  it('has aria-label on cart link', () => {
    expect(src).toContain('aria-label="Shopping cart"');
  });

  it('has aria-label on mobile menu toggle', () => {
    expect(src).toContain('aria-label="Toggle menu"');
  });
});

// ─── Footer ARIA ────────────────────────────────────────────

describe('Footer accessibility', () => {
  const src = readComponent('components/layout/footer.tsx');

  it('has footer navigation with aria-label', () => {
    expect(src).toContain('aria-label="Footer navigation"');
  });

  it('wraps quick links in <nav>', () => {
    expect(src).toContain('<nav aria-label="Footer navigation">');
  });
});

// ─── Product detail ARIA ────────────────────────────────────

describe('Product detail page accessibility', () => {
  const src = readComponent('app/[locale]/products/[slug]/page.tsx');

  it('has breadcrumb with aria-label', () => {
    expect(src).toContain('aria-label="Breadcrumb"');
  });

  it('has aria-label on decrease quantity button', () => {
    expect(src).toContain('aria-label="Decrease quantity"');
  });

  it('has aria-label on increase quantity button', () => {
    expect(src).toContain('aria-label="Increase quantity"');
  });

  it('has aria-live on quantity display', () => {
    expect(src).toContain('aria-live="polite"');
  });
});

// ─── Admin page ARIA ────────────────────────────────────────

describe('Admin page accessibility', () => {
  const src = readComponent('app/[locale]/admin/page.tsx');

  it('has navigation role on sidebar nav', () => {
    expect(src).toContain('role="navigation"');
  });

  it('has aria-label on admin navigation', () => {
    expect(src).toContain('aria-label="Admin navigation"');
  });

  it('has aria-current on active tab', () => {
    expect(src).toContain("aria-current={activeTab === item.id ? 'page' : undefined}");
  });

  it('has aria-label on sidebar toggle', () => {
    expect(src).toContain('aria-label="Toggle sidebar"');
  });

  it('has aria-expanded on sidebar toggle', () => {
    expect(src).toContain('aria-expanded={sidebarOpen}');
  });

  it('has aria-label on notifications button', () => {
    expect(src).toContain('aria-label="Notifications"');
  });
});

// ─── Layout skip-to-content ─────────────────────────────────

describe('Layout accessibility', () => {
  const src = readComponent('app/[locale]/layout.tsx');

  it('has skip-to-content link', () => {
    expect(src).toContain('Skip to main content');
    expect(src).toContain('#main-content');
  });

  it('has main element with id', () => {
    expect(src).toContain('id="main-content"');
  });

  it('sets html lang attribute', () => {
    expect(src).toContain('lang={locale}');
  });

  it('skip-to-content uses sr-only pattern', () => {
    expect(src).toContain('sr-only');
    expect(src).toContain('focus:not-sr-only');
  });
});

// ─── Cart page ARIA ─────────────────────────────────────────

describe('Cart page accessibility', () => {
  const src = readComponent('components/ui/cart-item-row.tsx');

  it('has aria-label on decrease quantity button', () => {
    expect(src).toContain('aria-label={`Decrease quantity of ${item.product.name_en}`}');
  });

  it('has aria-label on increase quantity button', () => {
    expect(src).toContain('aria-label={`Increase quantity of ${item.product.name_en}`}');
  });

  it('has aria-label on remove button', () => {
    expect(src).toContain('aria-label={`Remove ${item.product.name_en} from cart`}');
  });

  it('has aria-label on quantity input', () => {
    expect(src).toContain('aria-label={`Quantity of ${item.product.name_en}`}');
  });
});

// ─── Checkout retry focus (Bug #5) ──────────────────────────

describe('Checkout retry accessibility', () => {
  const src = readComponent('app/[locale]/checkout/page.tsx');

  it('has retryButtonRef on retry button', () => {
    expect(src).toContain('ref={retryButtonRef}');
  });

  it('has data-focus-trap-disabled on retry button', () => {
    expect(src).toContain('data-focus-trap-disabled');
  });

  it('auto-focuses retry button on failure', () => {
    expect(src).toContain('retryButtonRef.current?.focus()');
  });

  it('has role="alert" on error display', () => {
    expect(src).toContain('role="alert"');
  });
});

// ─── Sprinkle rain ARIA ─────────────────────────────────────

describe('SprinkleRain accessibility', () => {
  const src = readComponent('components/ui/sprinkle-rain.tsx');

  it('has aria-hidden on decorative overlay', () => {
    expect(src).toContain('aria-hidden="true"');
  });
});
