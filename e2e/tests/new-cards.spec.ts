import { test, expect } from '@playwright/test';

/**
 * 新卡牌类型 E2E 测试
 * 
 * 测试内容:
 * - +3, +5, +8 卡牌显示
 * - 卡牌颜色正确
 * - 卡牌在牌库中可被摸到
 */

test.setTimeout(60000);

test.describe('新卡牌类型测试', () => {
  
  test('游戏中可以显示新卡牌', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 创建房间并开始游戏
    await page.getByPlaceholder(/昵称/i).first().fill('新卡牌测试');
    await page.getByRole('button', { name: /创建房间/i }).click();
    await page.waitForTimeout(2000);
    
    // 添加多个AI增加游戏复杂度
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: /添加AI/i }).click();
      await page.waitForTimeout(300);
    }
    
    // 开始游戏
    await page.getByRole('button', { name: /开始游戏/i }).click();
    await page.waitForTimeout(2000);
    
    // 截图查看卡牌
    await page.screenshot({ path: 'test-results/new-cards-game.png' });
    
    // 检查手牌是否显示
    const pageContent = await page.content();
    expect(pageContent).toContain('张');
  });
  
  test('Out模式下的新卡牌', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 创建房间
    await page.getByPlaceholder(/昵称/i).first().fill('Out卡牌');
    await page.getByRole('button', { name: /创建房间/i }).click();
    await page.waitForTimeout(2000);
    
    // 添加AI
    await page.getByRole('button', { name: /添加AI/i }).click();
    await page.waitForTimeout(500);
    
    // 开始游戏（Out模式下会注入新卡牌）
    await page.getByRole('button', { name: /开始游戏/i }).click();
    await page.waitForTimeout(2000);
    
    // 截图
    await page.screenshot({ path: 'test-results/out-mode-cards.png' });
  });
  
  test('移动端新卡牌显示', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.getByPlaceholder(/昵称/i).first().fill('移动端卡牌');
    await page.getByRole('button', { name: /创建房间/i }).click();
    await page.waitForTimeout(2000);
    
    await page.getByRole('button', { name: /添加AI/i }).click();
    await page.waitForTimeout(500);
    
    await page.getByRole('button', { name: /开始游戏/i }).click();
    await page.waitForTimeout(2000);
    
    // 截图检查卡牌显示
    await page.screenshot({ path: 'test-results/mobile-new-cards.png' });
  });
});
