import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright 本地测试配置
 * 
 * 前置步骤:
 * 1. 确保后端运行在 http://localhost:3001
 * 2. 确保前端运行在 http://localhost:5173 (或实际端口)
 * 
 * 运行测试:
 *   npm run test:local
 * 
 * 注意: 测试会自动设置 localStorage 让前端连接到本地后端
 */

// 自动检测前端端口（Vite 默认 5173，备用 3000）
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report-local' }]],
  use: {
    baseURL: FRONTEND_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 15000,
    // 全局设置：确保前端连接到本地服务器
    storageState: {
      origins: [
        {
          origin: FRONTEND_URL,
          localStorage: [
            { name: 'uno-server-url', value: BACKEND_URL }
          ]
        }
      ]
    }
  },
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
  // 自动启动本地服务器（如果未运行）
  webServer: [
    {
      command: 'cd ../server && npm run dev',
      url: `${BACKEND_URL}/health`,
      timeout: 60000,
      reuseExistingServer: true,
    },
    {
      command: 'cd ../client && npm run dev',
      url: FRONTEND_URL,
      timeout: 60000,
      reuseExistingServer: true,
    },
  ],
});
