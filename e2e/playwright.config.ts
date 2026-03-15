import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright 配置文件
 * 用于运行 Uno Online 的 E2E 测试
 */

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // 改为 false 避免多浏览器同时操作冲突
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // 单 worker 避免测试间干扰
  reporter: [['list'], ['html', { outputFolder: 'playwright-report' }]],
  use: {
    baseURL: 'https://left0077.github.io/uno',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // 增加超时时间（生产环境可能较慢）
    actionTimeout: 15000,
    navigationTimeout: 20000,
  },
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
      },
    },
  ],
  // 不需要自动启动本地服务器（测试生产环境）
  // webServer: {
  //   command: 'cd ../server && npm run dev',
  //   url: 'http://localhost:3001/health',
  //   reuseExistingServer: true,
  // },
});
