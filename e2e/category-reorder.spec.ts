import { test, expect } from './fixtures/demo';
import type { DataState } from '../src/store/types';

test('CATEGORY-06: only the handle reorders within its group', async ({ demoPage: page }) => {
  await page.evaluate(() => {
    const app = window as typeof window & { useDataStore?: { getState: () => DataState } };
    const store = app.useDataStore?.getState();
    if (!store) throw new Error('Demo store is unavailable');
    for (const head of ['Alpha', 'Bravo', 'Charlie']) {
      store.addCategory({ group: 'Needs', head, isActive: true });
    }
    for (const head of ['Delta', 'Echo']) {
      store.addCategory({ group: 'Wants', head, isActive: true });
    }
  });

  const settingsLink =
    (page.viewportSize()?.width ?? 0) >= 1024
      ? page.locator('aside a[href="/settings"]')
      : page.locator('header a[href="/settings"]');
  await settingsLink.click();
  await page.locator('a[href="/settings/categories"]').click();
  await expect(page).toHaveURL(/\/settings\/categories$/);

  const needs = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Needs', exact: true }),
  });
  const wants = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Wants', exact: true }),
  });
  const alpha = needs.locator('li').filter({ hasText: 'Alpha' });
  const charlie = needs.locator('li').filter({ hasText: 'Charlie' });
  const needsNames = () => needs.locator('li p.font-bold').allTextContents();
  const storeNeedsOrder = () =>
    page.evaluate(() => {
      const app = window as typeof window & { useDataStore?: { getState: () => DataState } };
      return (app.useDataStore?.getState().categories || [])
        .filter(category => category.group === 'Needs')
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
        .map(category => category.head);
    });
  const originalOrder = await storeNeedsOrder();

  const rowBox = await alpha.boundingBox();
  const targetBox = await charlie.boundingBox();
  expect(rowBox).not.toBeNull();
  expect(targetBox).not.toBeNull();
  await page.mouse.move(rowBox!.x + 65, rowBox!.y + rowBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox!.x + 65, targetBox!.y + targetBox!.height / 2, { steps: 12 });
  await page.mouse.up();
  expect((await needsNames()).indexOf('Alpha')).toBeLessThan((await needsNames()).indexOf('Bravo'));

  const handle = alpha.getByRole('button', { name: /Reorder Alpha within Needs/ });
  const handleBox = await handle.boundingBox();
  const listBox = await needs.locator('ul').boundingBox();
  expect(handleBox).not.toBeNull();
  expect(listBox).not.toBeNull();
  const scrollPosition = await page
    .locator('[data-settings-scroll-container]')
    .evaluate(el => el.scrollTop);
  await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(handleBox!.x + handleBox!.width / 2, listBox!.y + listBox!.height + 90, {
    steps: 18,
  });

  await expect.poll(async () => (await needsNames()).indexOf('Alpha')).toBeGreaterThan(0);
  expect(await storeNeedsOrder()).toEqual(originalOrder);
  await expect(alpha.locator('[data-category-actions]')).toHaveCSS('opacity', '1');
  for (const actions of await needs
    .locator('li')
    .filter({ hasNotText: 'Alpha' })
    .locator('[data-category-actions]')
    .all()) {
    await expect(actions).toHaveCSS('opacity', test.info().project.name === 'desktop' ? '0' : '1');
  }

  const draggedBox = await alpha.boundingBox();
  expect(draggedBox).not.toBeNull();
  expect(draggedBox!.y + draggedBox!.height).toBeLessThanOrEqual(listBox!.y + listBox!.height + 2);
  if (test.info().project.name === 'iphone-portrait') {
    const afterScroll = await page
      .locator('[data-settings-scroll-container]')
      .evaluate(el => el.scrollTop);
    expect(Math.abs(afterScroll - scrollPosition)).toBeLessThanOrEqual(2);
  }
  await page.mouse.up();

  const reorderedNames = await needsNames();
  await expect.poll(storeNeedsOrder).toEqual(reorderedNames);
  await expect(wants.locator('li')).toHaveCount(2);
  await expect(wants.locator('li').first()).toContainText('Delta');

  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<string[]>((resolve, reject) => {
            const request = indexedDB.open('moniq-db');
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
              const db = request.result;
              const records = db
                .transaction('categories', 'readonly')
                .objectStore('categories')
                .getAll();
              records.onerror = () => reject(records.error);
              records.onsuccess = () => {
                db.close();
                resolve(
                  (records.result as DataState['categories'])
                    .filter(category => category.group === 'Needs')
                    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
                    .map(category => category.head)
                );
              };
            };
          })
      )
    )
    .toEqual(reorderedNames);
  await page.reload();
  await expect(needs.locator('li p.font-bold')).toHaveText(reorderedNames);

  await alpha.getByRole('button', { name: /Reorder Alpha within Needs/ }).focus();
  await page.keyboard.press('ArrowUp');
  await expect.poll(async () => (await needsNames()).indexOf('Alpha')).toBe(1);
});

test('CATEGORY-06: phone scrolling stays inside the dragged category group', async ({
  demoPage: page,
}) => {
  test.skip(test.info().project.name !== 'iphone-portrait', 'Checks phone drag scrolling');

  await page.evaluate(() => {
    const app = window as typeof window & { useDataStore?: { getState: () => DataState } };
    const store = app.useDataStore?.getState();
    if (!store) throw new Error('Demo store is unavailable');
    for (let index = 0; index < 5; index++) {
      store.addCategory({ group: 'Income', head: `Income ${index}`, isActive: true });
    }
    for (let index = 0; index < 20; index++) {
      store.addCategory({ group: 'Needs', head: `Need ${index}`, isActive: true });
    }
    store.addCategory({ group: 'Wants', head: 'Want', isActive: true });
  });

  await page.locator('header a[href="/settings"]').click();
  await page.locator('a[href="/settings/categories"]').click();
  const scroller = page.locator('[data-settings-scroll-container]');
  const needs = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Needs', exact: true }),
  });
  await needs.locator('ul').evaluate(element => element.scrollIntoView({ block: 'start' }));
  await scroller.evaluate(element => {
    element.scrollTop -= 100;
  });
  const startScroll = await scroller.evaluate(element => element.scrollTop);
  expect(startScroll).toBeGreaterThan(0);

  const handle = needs
    .locator('li')
    .first()
    .getByRole('button', { name: /Reorder Need 0/ });
  const box = await handle.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2 + 15, { steps: 5 });

  await scroller.evaluate(element => {
    element.scrollTop = 0;
  });
  await expect
    .poll(() => scroller.evaluate(element => element.scrollTop))
    .toBeGreaterThanOrEqual(startScroll - 1);

  await scroller.evaluate(element => {
    element.scrollTop = element.scrollHeight;
  });
  await expect
    .poll(async () => {
      const wants = await page.getByRole('heading', { name: 'Wants', exact: true }).boundingBox();
      const viewport = await scroller.boundingBox();
      return wants && viewport ? wants.y - (viewport.y + viewport.height) : -Infinity;
    })
    .toBeGreaterThanOrEqual(-2);
  await page.mouse.up();
});
