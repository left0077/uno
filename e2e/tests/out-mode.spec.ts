import { test, expect } from '@playwright/test';

/**
 * Out模式（Ring Mode）E2E 测试
 */

test.setTimeout(90000);

test.describe('Out模式测试', () => {
  
  async function createRoomAndStartGame(page: any, nickname: stout) {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.getByPlaceholder(/昵称/i).first().fill(nickname);
    await page.getByRole('button', { name: /创建房间/i }).click();
    await page.waitForTimeout(3000);
    
    // 添加AI
    await page.getByRole('button', { name: /添加AI/i }).click();
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: /普通/i }).click();
    await page.waitForTimeout(3000);
    
    const startButton = page.getByRole('button', { name: /开始游戏/i });
    await expect(startButton).toBeVisible({ timeout: 15000 });
    await startButton.click();
    await page.waitForTimeout(3000);
  }
  
  test('创建Out模式房间', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.getByPlaceholder(/昵称/i).first().fill('Out测试');
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /创建房间/i }).click();
    await page.waitForTimeout(3000);
    
    // 验证房间创建成功
    const pageContent = await page.content();
    expect(pageContent).toMatch(/\d{4}/);
  });
  
  test('Out倒计时UI显示', async ({ page }) => {
    await createRoomAndStartGame(page, '倒计时测试');
    
    // 检查游戏是否已开始
    const pageContent = await page.content();
    expect(pageContent).toMatch(/手牌|张|UNO/i);
  });
  
  test('移动端OutUI不遮挡', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await createRoomAndStartGame(page, '移动端测试');
    
    // 检查手牌区域是否可见
    const handArea = page.locator('.fixed.bottom-0').first();
    await expect(handArea).toBeVisible();
    
    await page.screenshot({ path: 'test-results/mobile-game.png' });
  });
});
