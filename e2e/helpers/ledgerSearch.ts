import type { Page } from '@playwright/test';

export async function fillLedgerSearch(page: Page, query: string) {
  if ((page.viewportSize()?.width ?? 0) >= 768) {
    await page.locator('input[placeholder="Search description..."]:not([aria-label])').fill(query);
    return;
  }

  const search = page.locator(
    'input[placeholder="Search description..."][aria-label="Search description..."]'
  );
  if (!(await search.isVisible())) {
    await page.getByRole('button', { name: 'Search description...' }).click();
  }
  await search.fill(query);
}
