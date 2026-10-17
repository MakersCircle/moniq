import { test, expect } from './fixtures/demo';
import type { DataState } from '../src/store/types';

test('METHOD-03: only the handle reorders payment methods and saves on drop', async ({
  demoPage: page,
}) => {
  await page.evaluate(() => {
    const app = window as typeof window & { useDataStore?: { getState: () => DataState } };
    const store = app.useDataStore?.getState();
    if (!store) throw new Error('Demo store is unavailable');
    const { accountId } = store.addAccount(
      {
        name: 'Reorder Account',
        type: 'Asset',
        initialBalance: 0,
        isSavings: false,
        excludeFromNet: false,
        isActive: true,
      },
      'Default Method'
    );
    for (const name of ['Method Alpha', 'Method Bravo', 'Method Charlie']) {
      store.addMethod({ name, linkedAccountId: accountId, isActive: true });
    }
  });

  const settingsLink =
    (page.viewportSize()?.width ?? 0) >= 1024
      ? page.locator('aside a[href="/settings"]')
      : page.locator('header a[href="/settings"]');
  await settingsLink.click();
  await page.locator('a[href="/settings/methods"]').click();
  await expect(page).toHaveURL(/\/settings\/methods$/);

  const list = page.locator('#tour-target-methods-page ul');
  await expect(list.locator('li')).toHaveCount(4);
  const names = () => list.locator('li p.font-bold.text-sm').allTextContents();
  const alpha = list.locator('li').filter({ hasText: 'Method Alpha' });
  const charlie = list.locator('li').filter({ hasText: 'Method Charlie' });
  const originalOrder = await names();

  const rowBox = await alpha.boundingBox();
  const targetBox = await charlie.boundingBox();
  expect(rowBox).not.toBeNull();
  expect(targetBox).not.toBeNull();
  await page.mouse.move(rowBox!.x + 80, rowBox!.y + rowBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox!.x + 80, targetBox!.y + targetBox!.height / 2, { steps: 10 });
  await page.mouse.up();
  expect(await names()).toEqual(originalOrder);

  const handle = alpha.getByRole('button', {
    name: 'Reorder Method Alpha. Drag or use arrow keys.',
  });
  const handleBox = await handle.boundingBox();
  expect(handleBox).not.toBeNull();
  await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox!.x + targetBox!.width / 2, targetBox!.y + targetBox!.height / 2, {
    steps: 12,
  });
  await expect.poll(names).not.toEqual(originalOrder);

  const previewOrder = await names();
  const storedBeforeDrop = await page.evaluate(() => {
    const app = window as typeof window & { useDataStore?: { getState: () => DataState } };
    return app
      .useDataStore!.getState()
      .methods.filter(method => method.isActive && !method.isDeleted)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      .map(method => method.name);
  });
  expect(storedBeforeDrop).toEqual(originalOrder);

  await page.mouse.up();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const app = window as typeof window & { useDataStore?: { getState: () => DataState } };
        return app
          .useDataStore!.getState()
          .methods.filter(method => method.isActive && !method.isDeleted)
          .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
          .map(method => method.name);
      })
    )
    .toEqual(previewOrder);
  await page.reload();
  await expect(page).toHaveURL(/\/settings\/methods$/);
  await expect
    .poll(() =>
      page.locator('#tour-target-methods-page ul li p.font-bold.text-sm').allTextContents()
    )
    .toEqual(previewOrder);
});
