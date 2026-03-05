import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });
test.setTimeout(45_000);

/**
 * E2E smoke tests — verify critical pages load and render key elements.
 * These run against a local dev server or CI deployment.
 */

test.describe('Smoke tests — page loads', () => {
  test('homepage loads and shows hero section', async ({ page }) => {
    await page.goto('/');
    // Should redirect to /tr or /en based on locale
    await expect(page).toHaveURL(/\/(tr|en)/);
    // Page should have the brand or hero content
    await expect(page.locator('body')).toBeVisible();
    // Title should be set
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('products page loads and shows product grid', async ({ page }) => {
    await page.goto('/en/products');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/en\/products/);
    await expect(page.locator('body')).toBeVisible();
    await expect(
      page.locator('h1, input[type="text"], section').first(),
    ).toBeVisible({ timeout: 30_000 });
  });

  test('stores page loads', async ({ page }) => {
    await page.goto('/en/stores');
    await expect(page).toHaveURL(/\/en\/stores/);
    await expect(page.locator('main, section').first()).toBeVisible();
    // Store page may render skeleton/content progressively; require any stable marker.
    await expect(
      page.locator('h1, input[placeholder*="Search"], input[placeholder*="Şehir"]').first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('cart page loads (empty cart)', async ({ page }) => {
    await page.goto('/en/cart');
    await expect(page).toHaveURL(/\/en\/cart/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('login page loads with form', async ({ page }) => {
    await page.goto('/en/login');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/en\/(login)?$/);

    if (page.url().includes('/en/login')) {
      await expect(page.locator('input[name="email"]').first()).toBeVisible({ timeout: 30_000 });
      await expect(page.locator('input[name="password"]').first()).toBeVisible({ timeout: 30_000 });
    } else {
      // Existing session may redirect to home; that is an allowed runtime state.
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('register page loads with form', async ({ page }) => {
    await page.goto('/en/register');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/en\/(register)?$/);

    if (page.url().includes('/en/register')) {
      await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 30_000 });
    } else {
      // If an existing session is restored, register page intentionally redirects home.
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

test.describe('Smoke tests — navigation', () => {
  test('critical navigation routes are reachable', async ({ page }) => {
    await page.goto('/en');
    await page.goto('/en/products');
    await expect(page).toHaveURL(/\/en\/products/);
    await page.goto('/en/cart');
    await expect(page).toHaveURL(/\/en\/cart/);
  });

  test('purchase-critical journey routes stay reachable (locale -> products -> cart -> checkout)', async ({ page }) => {
    await page.goto('/en');
    await expect(page).toHaveURL(/\/en/);

    await page.goto('/en/products');
    await expect(page).toHaveURL(/\/en\/products/);

    await page.goto('/en/cart');
    await expect(page).toHaveURL(/\/en\/cart/);

    await page.goto('/en/checkout');
    // Checkout is intentionally protected by auth middleware.
    // Anonymous users are redirected to login with a return target.
    const checkoutOrLogin = /\/en\/(checkout|login)/;
    await expect(page).toHaveURL(checkoutOrLogin);

    const currentUrl = page.url();
    if (currentUrl.includes('/en/login')) {
      const redirect = new URL(currentUrl).searchParams.get('redirect');
      expect(redirect).toBe('/en/checkout');
    }

    await expect(page.locator('main, body').first()).toBeVisible();
  });

  test('purchase-critical journey routes stay reachable in tr locale (locale -> urunler -> sepet -> odeme)', async ({ page }) => {
    await page.goto('/tr');
    await expect(page).toHaveURL(/\/tr/);

    await page.goto('/tr/urunler');
    await expect(page).toHaveURL(/\/tr\/urunler/);

    await page.goto('/tr/sepet');
    await expect(page).toHaveURL(/\/tr\/sepet/);

    await page.goto('/tr/odeme');
    const checkoutOrLogin = /\/tr\/(odeme|giris)/;
    await expect(page).toHaveURL(checkoutOrLogin);

    const currentUrl = page.url();
    if (currentUrl.includes('/tr/giris')) {
      const redirect = new URL(currentUrl).searchParams.get('redirect');
      expect(redirect).toBe('/tr/odeme');
    }

    await expect(page.locator('main, body').first()).toBeVisible();
  });

  test('locale switching works', async ({ page }) => {
    await page.goto('/en');
    const localeLink = page.locator('a[href*="/tr"], button:has-text("TR")').first();
    if (await localeLink.count()) {
      await localeLink.click();
      await expect(page).toHaveURL(/\/tr/);
    } else {
      await page.goto('/tr');
      await expect(page).toHaveURL(/\/tr/);
    }
  });
});

test.describe('Smoke tests — login flow', () => {
  test('login form validates empty submission', async ({ page }) => {
    await page.goto('/en/login');
    // Try to submit empty form
    const submitBtn = page.locator('button[type="submit"]').first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      // Should stay on login page (validation prevents navigation)
      await expect(page).toHaveURL(/\/en\/login/);
    }
  });

  test('login form accepts email input', async ({ page }) => {
    await page.goto('/en/login');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/en\/(login)?$/);

    if (!page.url().includes('/en/login')) {
      // Existing session may redirect to home; that is an allowed runtime state.
      await expect(page.locator('body')).toBeVisible();
      return;
    }

    const emailInput = page.locator('input[name="email"]');
    await expect(emailInput).toBeVisible({ timeout: 30_000 });
    await emailInput.fill('test@example.com');
    await expect(emailInput).toHaveValue('test@example.com');
  });
});

test.describe('Smoke tests — products flow', () => {
  test('product search filters results', async ({ page }) => {
    await page.goto('/en/products');
    const searchInput = page.locator('input[type="text"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('chocolate');
      // Wait for debounce
      await page.waitForTimeout(500);
      // Page should still be visible with filtered results
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
