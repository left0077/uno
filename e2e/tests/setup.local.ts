/**
 * 本地测试全局设置
 * 确保前端连接到本地后端服务器
 */

import { test as base } from '@playwright/test';

// 本地后端地址
const LOCAL_SERVER_URL = 'http://localhost:3001';

// 扩展 test 配置
export const test = base.extend({
  // 每个测试前执行
  page: async ({ page }, use) => {
    // 设置 localStorage，让前端连接到本地服务器
    await page.addInitScript((url) => {
      localStorage.setItem('uno-server-url', url);
      console.log('[E2E Setup] 设置服务器地址:', url);
    }, LOCAL_SERVER_URL);
    
    await use(page);
  },
});

export { expect } from '@playwright/test';
