import { test, expect } from '@playwright/test';

/**
 * Visual regression tests — screenshot comparison for critical pages.
 *
 * Pages tested:
 *   1. Login page — form layout, branding
 *   2. Cart page — empty state, item layout
 *   3. Checkout page — form layout, order summary
 *
 * Usage:
 *   npx playwright test e2e/visual-regression.spec.ts              # run
 *   npx playwright test e2e/visual-regression.spec.ts --update-snapshots  # update baselines
 *
 * Snapshots stored in: e2e/visual-regression.spec.ts-snapshots/
 *
 * Configuration:
 *   - maxDiffPixelRatio: 0.01 (1% pixel diff allowed for anti-aliasing)
 *   - threshold: 0.2 (per-pixel color diff tolerance)
 */

test.describe('Visual regression — Login', () => {
  test('login page layout matches baseline', async ({ page }) => {
    await page.goto('/en/login');
    await page.waitForLoadState('networkidle');

    // Wait for fonts and images to load
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('login-page.png', {
      maxDiffPixelRatio: 0.01,
      threshold: 0.2,
      fullPage: true,
    });
  });

  test('login form elements are visible', async ({ page }) => {
    await page.goto('/en/login');
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]').first();

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    if (await submitButton.isVisible()) {
      await expect(submitButton).toHaveScreenshot('login-submit-button.png', {
        maxDiffPixelRatio: 0.02,
        threshold: 0.2,
      });
    }
  });
});

test.describe('Visual regression — Cart', () => {
  test('empty cart page matches baseline', async ({ page }) => {
    await page.goto('/en/cart');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('cart-empty.png', {
      maxDiffPixelRatio: 0.01,
      threshold: 0.2,
      fullPage: true,
    });
  });

  test('cart page header is consistent', async ({ page }) => {
    await page.goto('/en/cart');
    await page.waitForLoadState('networkidle');

    const header = page.locator('header').first();
    if (await header.isVisible()) {
      await expect(header).toHaveScreenshot('cart-header.png', {
        maxDiffPixelRatio: 0.02,
        threshold: 0.2,
      });
    }
  });
});

test.describe('Visual regression — Checkout', () => {
  test('checkout page layout matches baseline', async ({ page }) => {
    await page.goto('/en/checkout');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Checkout may redirect to login or show empty cart
    // Either state should be visually stable
    await expect(page).toHaveScreenshot('checkout-page.png', {
      maxDiffPixelRatio: 0.01,
      threshold: 0.2,
      fullPage: true,
    });
  });
});

test.describe('Visual regression — Homepage', () => {
  test('homepage hero section matches baseline', async ({ page }) => {
    await page.goto('/en');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Capture above-the-fold area only (viewport)
    await expect(page).toHaveScreenshot('homepage-hero.png', {
      maxDiffPixelRatio: 0.01,
      threshold: 0.2,
      fullPage: false,
    });
  });
});
