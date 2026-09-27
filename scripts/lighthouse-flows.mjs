import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import { startFlow } from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';

const ROUTES = [
  '/',
  '/dashboard',
  '/transactions',
  '/insights',
  '/budget',
  '/settings',
  '/settings/accounts',
  '/settings/categories'
];

const FORM_FACTORS = ['mobile', 'desktop'];
const BASE_URL = 'http://localhost:8787';

async function runFlow(route, formFactor) {
  const isDesktop = formFactor === 'desktop';
  const reportPath = path.resolve(`./lighthouse-reports/flow-${formFactor}-${route === '/' ? 'home' : route.slice(1).replace(/\//g, '-')}.html`);
  
  // Puppeteer config
  const browser = await puppeteer.launch({
    headless: true, // Use old headless for CDP reliability
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
  });

  const page = await browser.newPage();
  
  // Lighthouse config
  const configContext = {
    settingsOverrides: {
      screenEmulation: {
        mobile: !isDesktop,
        width: isDesktop ? 1350 : 412,
        height: isDesktop ? 940 : 823,
        deviceScaleFactor: isDesktop ? 1 : 1.75,
        disabled: false,
      },
      formFactor: formFactor,
    }
  };
  
  const config = isDesktop ? desktopConfig : undefined;
  
  const flow = await startFlow(page, {
    name: `Moniq - ${route} (${formFactor})`,
    config,
    flags: configContext.settingsOverrides
  });

  const url = `${BASE_URL}${route}`;
  console.log(`\nTesting ${url} on ${formFactor}...`);

  try {
    // 1. Navigation
    console.log(`  - Running Navigation audit...`);
    await flow.navigate(url, { stepName: 'Navigation Load' });

    // 2. Timespan (Simulate interaction)
    console.log(`  - Running Timespan audit...`);
    await flow.startTimespan({ stepName: 'Interactions' });
    
    // Simulate user interaction: wait a moment, scroll a bit
    await new Promise(r => setTimeout(r, 1000));
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight / 2);
    });
    await new Promise(r => setTimeout(r, 1000));
    
    await flow.endTimespan();

    // 3. Snapshot
    console.log(`  - Running Snapshot audit...`);
    await flow.snapshot({ stepName: 'Final State Snapshot' });

    // Generate and save report
    console.log(`  - Generating report...`);
    const reportHtml = await flow.generateReport();
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, reportHtml);
    console.log(`  - Saved: ${reportPath}`);
    
  } catch (error) {
    console.error(`  ! Error during flow for ${route} (${formFactor}):`, error);
  } finally {
    await browser.close();
  }
}

async function runModalFlow(formFactor) {
  const isDesktop = formFactor === 'desktop';
  const reportPath = path.resolve(`./lighthouse-reports/flow-${formFactor}-modal-add-transaction.html`);
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
  });

  const page = await browser.newPage();
  
  const configContext = {
    settingsOverrides: {
      screenEmulation: {
        mobile: !isDesktop,
        width: isDesktop ? 1350 : 412,
        height: isDesktop ? 940 : 823,
        deviceScaleFactor: isDesktop ? 1 : 1.75,
        disabled: false,
      },
      formFactor: formFactor,
    }
  };
  
  const config = isDesktop ? desktopConfig : undefined;
  
  const flow = await startFlow(page, {
    name: `Moniq - Add Transaction Modal (${formFactor})`,
    config,
    flags: configContext.settingsOverrides
  });

  const url = `${BASE_URL}/dashboard`;
  console.log(`\nTesting Add Transaction Modal on ${formFactor}...`);

  try {
    console.log(`  - Navigating to dashboard...`);
    await flow.navigate(url, { stepName: 'Dashboard Load' });
    await new Promise(r => setTimeout(r, 2000));

    console.log(`  - Opening Modal...`);
    await flow.startTimespan({ stepName: 'Open Add Transaction Modal' });
    await page.evaluate(() => {
      if (window.openTransactionModal && window.openTransactionModal.openNew) {
        window.openTransactionModal.openNew();
      }
    });
    await new Promise(r => setTimeout(r, 1500));
    await flow.endTimespan();

    console.log(`  - Capturing Modal Snapshot...`);
    await flow.snapshot({ stepName: 'Add Transaction Modal State' });

    console.log(`  - Generating report...`);
    const reportHtml = await flow.generateReport();
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, reportHtml);
    console.log(`  - Saved: ${reportPath}`);
  } catch (error) {
    console.error(`  ! Error during flow for modal (${formFactor}):`, error);
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log('Starting Comprehensive Lighthouse Flows...');
  for (const route of ROUTES) {
    for (const formFactor of FORM_FACTORS) {
      await runFlow(route, formFactor);
    }
  }
  console.log('\nStarting Add Transaction Modal Flows...');
  for (const formFactor of FORM_FACTORS) {
    await runModalFlow(formFactor);
  }
  console.log('\nAll flows completed!');
}

main().catch(console.error);
