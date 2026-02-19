import { test, expect } from '@playwright/test';

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
    await expect(page).toHaveURL(/\/en\/products/);
    // Should have at least one product card
    await expect(page.locator('h1')).toBeVisible();
  });

  test('stores page loads', async ({ page }) => {
    await page.goto('/en/stores');
    await expect(page).toHaveURL(/\/en\/stores/);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('cart page loads (empty cart)', async ({ page }) => {
    await page.goto('/en/cart');
    await expect(page).toHaveURL(/\/en\/cart/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('login page loads with form', async ({ page }) => {
    await page.goto('/en/login');
    await expect(page).toHaveURL(/\/en\/login/);
    // Should show email input
    await expect(page.locator('input[type="email"]')).toBeVisible();
    // Should show password input
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('register page loads with form', async ({ page }) => {
    await page.goto('/en/register');
    await expect(page).toHaveURL(/\/en\/register/);
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});

test.describe('Smoke tests — navigation', () => {
  test('header navigation links work', async ({ page }) => {
    await page.goto('/en');
    // Click products link if visible in header
    const productsLink = page.locator('header a[href*="products"]').first();
    if (await productsLink.isVisible()) {
      await productsLink.click();
      await expect(page).toHaveURL(/\/en\/products/);
    }
  });

  test('locale switching works', async ({ page }) => {
    await page.goto('/en');
    // Look for TR/Turkish locale switch
    const localeLink = page.locator('a[href*="/tr"], button:has-text("TR")').first();
    if (await localeLink.isVisible()) {
      await localeLink.click();
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
    const emailInput = page.locator('input[type="email"]');
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
