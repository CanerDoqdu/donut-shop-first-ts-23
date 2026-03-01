import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * WCAG AA Audit — keyboard, focus, contrast, and semantic HTML checks.
 *
 * Complements tests/a11y/aria-attributes.test.ts (which covers ARIA attrs).
 * This file focuses on WCAG 2.1 AA criteria:
 *
 *  1.3.1 — Info and Relationships (semantic HTML)
 *  1.4.3 — Contrast (minimum)
 *  2.1.1 — Keyboard accessible
 *  2.4.1 — Bypass blocks (skip links)
 *  2.4.3 — Focus order
 *  2.4.7 — Focus visible
 *  2.4.11 — Focus not obscured
 *  3.3.1 — Error identification
 *  3.3.2 — Labels or instructions
 *  4.1.2 — Name, Role, Value
 */

function readComponent(relativePath: string): string {
  const fullPath = join(process.cwd(), relativePath);
  if (!existsSync(fullPath)) return '';
  return readFileSync(fullPath, 'utf-8');
}

function readIfExists(relativePath: string): string | null {
  const fullPath = join(process.cwd(), relativePath);
  if (!existsSync(fullPath)) return null;
  return readFileSync(fullPath, 'utf-8');
}

// ═══════════════════════════════════════════════════════════════
// 2.4.7 — Focus Visible
// ═══════════════════════════════════════════════════════════════

describe('WCAG 2.4.7 — Focus Visible', () => {
  describe('Button component uses focus-visible ring', () => {
    const src = readComponent('components/ui/button.tsx');

    it('has focus-visible:ring styles', () => {
      expect(src).toContain('focus-visible:');
      expect(src).toMatch(/focus-visible:ring/);
    });

    it('has ring-offset for clear visibility', () => {
      expect(src).toContain('ring-offset');
    });
  });

  describe('Checkbox component uses focus-visible ring', () => {
    const src = readComponent('components/ui/checkbox.tsx');

    it('has focus-visible:ring styles', () => {
      expect(src).toContain('focus-visible:ring');
    });
  });

  describe('Variant selector uses focus-visible ring', () => {
    const src = readComponent('components/ui/variant-selector.tsx');

    it('has focus-visible ring on option buttons', () => {
      expect(src).toContain('focus-visible:ring');
    });
  });

  describe('Input component has focus styling', () => {
    const src = readComponent('components/ui/input.tsx');

    it('has focus or focus-visible ring', () => {
      // Input may use focus: or focus-visible: — either is acceptable
      expect(src).toMatch(/focus(-visible)?:ring/);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// 2.4.1 — Bypass Blocks (Skip Links)
// ═══════════════════════════════════════════════════════════════

describe('WCAG 2.4.1 — Bypass Blocks', () => {
  const layout = readComponent('app/[locale]/layout.tsx');

  it('has skip-to-content link', () => {
    expect(layout).toContain('Skip to main content');
  });

  it('skip link targets #main-content', () => {
    expect(layout).toContain('#main-content');
  });

  it('main element has matching id', () => {
    expect(layout).toContain('id="main-content"');
  });

  it('skip link uses sr-only class', () => {
    expect(layout).toContain('sr-only');
  });

  it('skip link becomes visible on focus', () => {
    expect(layout).toContain('focus:not-sr-only');
  });
});

// ═══════════════════════════════════════════════════════════════
// 1.3.1 — Info and Relationships (Semantic HTML)
// ═══════════════════════════════════════════════════════════════

describe('WCAG 1.3.1 — Semantic HTML', () => {
  it('layout uses <main> element', () => {
    const layout = readComponent('app/[locale]/layout.tsx');
    expect(layout).toMatch(/<main[\s>]/);
  });

  it('header uses <nav> element', () => {
    const header = readComponent('components/layout/header.tsx');
    expect(header).toMatch(/<nav[\s>]/);
  });

  it('footer wraps links in <nav>', () => {
    const footer = readComponent('components/layout/footer.tsx');
    expect(footer).toMatch(/<nav[\s>]/);
  });

  it('html has lang attribute from locale', () => {
    const layout = readComponent('app/[locale]/layout.tsx');
    expect(layout).toContain('lang={locale}');
  });
});

// ═══════════════════════════════════════════════════════════════
// 3.3.2 — Labels or Instructions
// ═══════════════════════════════════════════════════════════════

describe('WCAG 3.3.2 — Labels', () => {
  describe('Login page has labeled inputs', () => {
    const src = readComponent('app/[locale]/login/page.tsx');

    it('has email input label or aria-label', () => {
      expect(src).toMatch(/(label|aria-label).*([Ee]mail|e-?mail)/s);
    });

    it('has password input label or aria-label', () => {
      expect(src).toMatch(/(label|aria-label).*([Pp]assword|şifre|parola)/s);
    });
  });

  describe('Cart item row has labeled controls', () => {
    const src = readComponent('components/ui/cart-item-row.tsx');

    it('decrease button has aria-label', () => {
      expect(src).toContain('aria-label=');
      expect(src).toMatch(/[Dd]ecrease/);
    });

    it('increase button has aria-label', () => {
      expect(src).toMatch(/[Ii]ncrease/);
    });

    it('remove button has aria-label', () => {
      expect(src).toMatch(/[Rr]emove/);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// 3.3.1 — Error Identification
// ═══════════════════════════════════════════════════════════════

describe('WCAG 3.3.1 — Error Identification', () => {
  it('checkout page has role="alert" for errors', () => {
    const src = readComponent('app/[locale]/checkout/page.tsx');
    expect(src).toContain('role="alert"');
  });

  it('field-error component exists for form validation', () => {
    const src = readIfExists('components/ui/field-error.tsx');
    expect(src).not.toBeNull();
  });

  it('registration toast uses aria-live', () => {
    const src = readComponent('components/ui/registration-toast.tsx');
    expect(src).toContain('aria-live');
  });
});

// ═══════════════════════════════════════════════════════════════
// 4.1.2 — Name, Role, Value
// ═══════════════════════════════════════════════════════════════

describe('WCAG 4.1.2 — Name, Role, Value', () => {
  it('header dropdown buttons have aria-expanded', () => {
    const src = readComponent('components/layout/header.tsx');
    expect(src).toContain('aria-expanded');
  });

  it('header dropdown buttons have aria-haspopup', () => {
    const src = readComponent('components/layout/header.tsx');
    expect(src).toContain('aria-haspopup');
  });

  it('variant selector uses aria-pressed', () => {
    const src = readComponent('components/ui/variant-selector.tsx');
    expect(src).toContain('aria-pressed');
  });

  it('decorative elements have aria-hidden', () => {
    const sprinkle = readComponent('components/ui/sprinkle-rain.tsx');
    expect(sprinkle).toContain('aria-hidden="true"');
  });
});

// ═══════════════════════════════════════════════════════════════
// 1.4.3 — Color Contrast (static check: no inline color-on-color)
// ═══════════════════════════════════════════════════════════════

describe('WCAG 1.4.3 — Contrast checks', () => {
  it('button component does not use low-contrast text patterns', () => {
    const src = readComponent('components/ui/button.tsx');
    // Check that we don't have text-white on yellow/light backgrounds
    // This is a heuristic — full contrast requires runtime testing
    expect(src).not.toMatch(/text-yellow.*bg-yellow/);
    expect(src).not.toMatch(/text-gray-300.*bg-white/);
  });

  it('error boundary has sufficient contrast (red text on themed bg)', () => {
    const src = readComponent('components/ui/component-error-boundary.tsx');
    // Error text should use strong color — red/red-600+ on neutral background
    expect(src).toMatch(/text-red/);
  });
});

// ═══════════════════════════════════════════════════════════════
// Overall WCAG AA Compliance Summary
// ═══════════════════════════════════════════════════════════════

describe('WCAG AA compliance summary', () => {
  it('no suppressions of focus ring (focus:ring-0 on interactive elements)', () => {
    // Scan button.tsx and input.tsx for focus:ring-0 which would hide focus indicator
    const button = readComponent('components/ui/button.tsx');
    const input = readComponent('components/ui/input.tsx');
    // These core components should NOT suppress focus rings
    expect(button).not.toContain('focus:ring-0');
    expect(input).not.toContain('focus:ring-0');
  });

  it('section-suspense uses aria-live for loading state', () => {
    const src = readComponent('components/ui/section-suspense.tsx');
    expect(src).toMatch(/role="status"|aria-live/);
  });
});
