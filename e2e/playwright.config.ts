import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // 使用系统 Chrome
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      },
    },
  ],
  webServer: {
    command: 'cd ../server && npm run dev',
    url: 'http://localhost:3001/health',
    reuseExistingServer: true,
  },
});
