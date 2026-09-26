import { chromium } from 'playwright';
import { playAudit } from 'playwright-lighthouse';
import fs from 'fs/promises';

const ROUTES = [
  '/',
];

async function run() {
  const port = 9222;
  const browser = await chromium.launch({
    args: [`--remote-debugging-port=${port}`],
    headless: true,
    channel: 'chrome'
  });
  
  const page = await browser.newPage();
  
  // Set demo mode via localStorage/IndexedDB or just UI interaction
  await page.goto('http://localhost:8787/');
  
  // Look for "Try Demo" button and click it to set isDemoMode
  // We can just evaluate a script to enter demo mode
  try {
    await page.evaluate(() => {
      // Trying to trigger demo mode if useDataStore is on window, otherwise we click the button
      const demoBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Demo'));
      if (demoBtn) demoBtn.click();
    });
  } catch (e) {}

  await page.waitForTimeout(2000); // wait for demo mode to initialize

  const results = {};

  for (const route of ROUTES) {
    console.log(`Auditing ${route}...`);
    await page.goto(`http://localhost:8787${route}`);
    await page.waitForTimeout(1000); // Wait for page to settle

    try {
      const audit = await playAudit({
        page: page,
        thresholds: {
          performance: 0,
          accessibility: 0,
          'best-practices': 0,
          seo: 0,
        },
        port: port,
        reports: {
          formats: {
            json: true,
            html: false,
            csv: false,
          },
          name: `lighthouse-${route.replace(/[\/\\]/g, '_')}`,
          directory: './lighthouse-reports'
        },
      });
      console.log(`Scores for ${route}:`, audit.lhr.categories);
      results[route] = Object.fromEntries(
        Object.entries(audit.lhr.categories).map(([k, v]) => [k, v.score])
      );
    } catch (e) {
      console.error(`Error auditing ${route}:`, e);
    }
  }

  await browser.close();
  
  await fs.writeFile('lighthouse-summary.json', JSON.stringify(results, null, 2));
  console.log('Audit complete, results saved to lighthouse-summary.json');
}

run().catch(console.error);
