import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'desktop',
      use: { 
        viewport: { width: 1440, height: 900 },
        hasTouch: false 
      },
    },
    {
      name: 'ipad-landscape',
      use: { 
        viewport: { width: 1180, height: 820 },
        hasTouch: true 
      },
    },
    {
      name: 'ipad-portrait',
      use: { 
        viewport: { width: 820, height: 1180 },
        hasTouch: true 
      },
    },
    {
      name: 'iphone-portrait',
      use: { 
        viewport: { width: 402, height: 874 },
        hasTouch: true 
      },
    },
    {
      name: 'iphone-landscape',
      use: { 
        viewport: { width: 874, height: 402 },
        hasTouch: true 
      },
    },
    {
      name: 'fold-landscape',
      use: { 
        viewport: { width: 1104, height: 884 },
        hasTouch: true 
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    env: {
      // Dummy variable just to satisfy vite build/dev if it crashes without it
      VITE_GOOGLE_CLIENT_ID: 'mock-client-id-for-tests',
    },
  },
});
