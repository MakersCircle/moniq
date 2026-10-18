import { test, expect } from '@playwright/test';
import { installFakeGoogle } from './fixtures/google';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await installFakeGoogle(page);
    await page.goto('/');
  });

  test.describe('5a. Layout & Visibility', () => {
    test('E-01 & E-02: Wordmark and logo image render', async ({ page }) => {
      // Find the wordmark container by looking for its aspect ratio style or specific class
      const wordmarkContainer = page.locator('div[style*="aspect-ratio"], div[style*="466 / 346"]').first();
      await expect(wordmarkContainer).toBeVisible();
      
      const qLogo = page.getByAltText('moniq logo');
      await expect(qLogo).toBeVisible();
    });

    test('E-03 & E-04: Typography visible', async ({ page }) => {
      await expect(page.getByText(/Seamless personal finance/)).toBeVisible();
      await expect(page.getByText(/Your data is yours/)).toBeVisible();
    });

    test('E-05: Footer links visible', async ({ page }) => {
      await expect(page.getByRole('link', { name: 'Docs' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Privacy Policy' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Terms of Service' })).toBeVisible();
    });

    test('E-06 & E-07: No overflow (page fits exactly 100dvh/vw)', async ({ page }) => {
      await expect(page.locator('#root > .overflow-hidden')).toHaveCSS('overflow', 'hidden');
      const { scrollWidth, innerWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      
      expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
      const mainDivOverflow = await page.evaluate(() => window.getComputedStyle(document.querySelector('.overflow-hidden') || document.body).overflow);
      expect(mainDivOverflow).toBe('hidden');
    });
  });

  test.describe('5b. CTA Button — touch devices', () => {
    test('E-08: Label visible without interaction', async ({ page, hasTouch }) => {
      if (!hasTouch) return;
      const labelContainer = page.locator('div.grid').first();
      const cols = await labelContainer.evaluate(el => window.getComputedStyle(el).gridTemplateColumns);
      expect(cols).not.toBe('0px'); // It's expanded
    });
  });

  test.describe('5c. CTA Button — desktop', () => {
    test('E-10 & E-11: Label hidden by default, expands on hover', async ({ page, hasTouch }) => {
      if (hasTouch) return; // Desktop pointer devices only

      // Before hover, we check if the grid is collapsed (0fr or 0px or auto with 0 width)
      // Since computedStyle of gridTemplateColumns could be "0px", "0fr", or the actual width if it failed to collapse,
      // let's check the actual width of the overflow container instead.
      const signInControl = page.locator('.group > div.cursor-pointer');
      const labelTextContainer = signInControl.locator('.overflow-hidden');
      let box = await labelTextContainer.boundingBox();
      expect(box?.width).toBeLessThan(10); // should be collapsed near 0px
      
      // Hover the button
      await signInControl.hover();
      
      // After hover
      // Note: CSS transitions take 700ms. We wait for the box to expand.
      await page.waitForTimeout(750);
      box = await labelTextContainer.boundingBox();
      expect(box?.width).toBeGreaterThan(100); // Expanded
    });
  });

  test.describe('5d. Responsive Layout', () => {
    test('E-13: Portrait - Stacked layout', async ({ page, viewport }) => {
      if (!viewport || viewport.width >= viewport.height) return; // Portrait only
      
      const wordmarkContainer = page.locator('div[style*="aspect-ratio"], div[style*="466 / 346"]').first();
      const ctaBlock = page.getByText(/Seamless personal finance/).locator('..');
      
      const wmBox = await wordmarkContainer.boundingBox();
      const ctaBox = await ctaBlock.boundingBox();
      
      expect(wmBox).not.toBeNull();
      expect(ctaBox).not.toBeNull();
      
      // Wordmark is below CTA
      expect(wmBox!.y).toBeGreaterThanOrEqual(ctaBox!.y + ctaBox!.height);
    });

    test('E-14: Landscape phone - Side-by-side layout', async ({ page, viewport }) => {
      if (!viewport || viewport.height > 500 || viewport.width <= viewport.height) return; // Landscape phone only
      
      const wordmarkContainer = page.locator('div[style*="aspect-ratio"], div[style*="466 / 346"]').first();
      const ctaBlock = page.getByText(/Seamless personal finance/).locator('..');
      
      const wmBox = await wordmarkContainer.boundingBox();
      const ctaBox = await ctaBlock.boundingBox();
      
      // Wordmark is visually left of CTA
      expect(wmBox!.x).toBeLessThan(ctaBox!.x);
    });

    test('E-21: Footer does not overlap wordmark', async ({ page }) => {
      // In very narrow mobile viewports, the footer might overlap if the screen is too short, but let's check it.
      const wordmarkContainer = page.locator('div[style*="aspect-ratio"], div[style*="466 / 346"]').first();
      const footer = page.getByRole('link', { name: 'Docs' }).locator('..');
      
      const wmBox = await wordmarkContainer.boundingBox();
      const footerBox = await footer.boundingBox();
      
      // Check intersection
      const intersectX = Math.max(0, Math.min(wmBox!.x + wmBox!.width, footerBox!.x + footerBox!.width) - Math.max(wmBox!.x, footerBox!.x));
      const intersectY = Math.max(0, Math.min(wmBox!.y + wmBox!.height, footerBox!.y + footerBox!.height) - Math.max(wmBox!.y, footerBox!.y));
      
      expect(intersectX * intersectY).toBe(0); // Area of intersection should be 0
    });
  });

  test.describe('5e. Navigation', () => {
    test('E-22: Docs navigation', async ({ page }) => {
      await page.getByRole('link', { name: 'Docs' }).click();
      await expect(page).toHaveURL(/.*\/docs/);
    });
    
    test('E-23: Privacy Policy navigation', async ({ page }) => {
      await page.getByRole('link', { name: 'Privacy Policy' }).click();
      await expect(page).toHaveURL(/.*\/privacy-policy/);
    });
    
    test('E-24: Terms navigation', async ({ page }) => {
      await page.getByRole('link', { name: 'Terms of Service' }).click();
      await expect(page).toHaveURL(/.*\/terms-of-service/);
    });
  });
});
