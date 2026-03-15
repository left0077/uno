import { test, expect } from '@playwright/test';

/**
 * 移动端 UI 测试
 */

test.setTimeout(90000);

const devices = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone 12', width: 390, height: 844 },
  { name: 'iPad Mini', width: 768, height: 1024 },
];

test.describe('移动端 UI 测试', () => {
  
  async function createRoomAndStartGame(page: any, nickname: stout) {
    await page.getByPlaceholder(/昵称/i).first().fill(nickname);
    await page.getByRole('button', { name: /创建房间/i }).click();
    await page.waitForTimeout(3000);
    
    await page.getByRole('button', { name: /添加AI/i }).click();
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: /普通/i }).click();
    await page.waitForTimeout(3000);
    
    const startButton = page.getByRole('button', { name: /开始游戏/i });
    await expect(startButton).toBeVisible({ timeout: 15000 });
    await startButton.click();
    await page.waitForTimeout(3000);
  }
  
  for (const device of devices) {
    test(`${device.name} 首页布局检查`, async ({ page }) => {
      await page.setViewportSize({ width: device.width, height: device.height });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator('h1, .title').first()).toBeVisible();
      await expect(page.getByPlaceholder(/昵称/i).first()).toBeVisible();
      await expect(page.getByRole('button', { name: /创建房间/i })).toBeVisible();
      
      await page.screenshot({ 
        path: `test-results/mobile-${device.name.replace(/\s+/g, '-').toLowerCase()}-home.png`,
        fullPage: true 
      });
    });
    
    test(`${device.name} 游戏页面布局检查`, async ({ page }) => {
      await page.setViewportSize({ width: device.width, height: device.height });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      await createRoomAndStartGame(page, 'UI测试');
      
      // 检查关键元素（使用文本内容而非 class）
      await expect(page.getByText(/房间/)).toBeVisible(); // 顶部房间号
      await expect(page.getByRole('button', { name: /UNO/i })).toBeVisible();
      await expect(page.locator('button[title="开启托管模式"]').first()).toBeVisible();
      
      // 检查玩家手牌区域
      const handText = await page.getByText(/张/).first();
      await expect(handText).toBeVisible();
      
      await page.screenshot({ 
        path: `test-results/mobile-${device.name.replace(/\s+/g, '-').toLowerCase()}-game.png`,
        fullPage: true 
      });
    });
  }
});
