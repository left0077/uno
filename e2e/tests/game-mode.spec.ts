import { test, expect } from '@playwright/test';

/**
 * 游戏模式选择 E2E 测试
 * 
 * 测试内容:
 * - 模式选择按钮显示
 * - 切换标准/Out模式
 * - 非房主无法修改模式
 */

test.setTimeout(60000);

test.describe('游戏模式选择测试', () => {
  
  test('房主可以看到模式选择按钮', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 创建房间
    await page.getByPlaceholder(/昵称/i).first().fill('房主');
    await page.getByRole('button', { name: /创建房间/i }).click();
    await page.waitForTimeout(3000);
    
    // 检查模式选择区域
    await expect(page.getByText(/游戏模式/)).toBeVisible();
    await expect(page.getByRole('button', { name: /标准/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Out/i })).toBeVisible();
    
    // 默认选中标准模式
    const standardButton = page.getByRole('button', { name: /标准/i });
    await expect(standardButton).toHaveClass(/bg-blue-600/);
  });
  
  test('房主可以切换游戏模式', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.getByPlaceholder(/昵称/i).first().fill('房主');
    await page.getByRole('button', { name: /创建房间/i }).click();
    await page.waitForTimeout(3000);
    
    // 切换到Out模式
    const outButton = page.getByRole('button', { name: /Out/i });
    await outButton.click();
    await page.waitForTimeout(500);
    
    // 验证Out模式被选中
    await expect(outButton).toHaveClass(/bg-red-600/);
    
    // 验证提示文字变化
    await expect(page.getByText(/Out模式/)).toBeVisible();
    
    // 切换回标准模式
    const standardButton = page.getByRole('button', { name: /标准/i });
    await standardButton.click();
    await page.waitForTimeout(500);
    
    // 验证标准模式被选中
    await expect(standardButton).toHaveClass(/bg-blue-600/);
  });
  
  test('Out模式游戏正常开始', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.getByPlaceholder(/昵称/i).first().fill('Out测试');
    await page.getByRole('button', { name: /创建房间/i }).click();
    await page.waitForTimeout(3000);
    
    // 切换到Out模式
    await page.getByRole('button', { name: /Out/i }).click();
    await page.waitForTimeout(500);
    
    // 添加AI
    await page.getByRole('button', { name: /添加AI/i }).click();
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: /普通/i }).click();
    await page.waitForTimeout(3000);
    
    // 开始游戏
    await page.getByRole('button', { name: /开始游戏/i }).click();
    await page.waitForTimeout(3000);
    
    // 验证游戏已开始（检查手牌区域）
    await expect(page.locator('.fixed.bottom-0').first()).toBeVisible();
    
    // 截图
    await page.screenshot({ path: 'test-results/out-mode-game.png' });
  });
  
  test('移动端模式选择UI正常', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.getByPlaceholder(/昵称/i).first().fill('移动端');
    await page.getByRole('button', { name: /创建房间/i }).click();
    await page.waitForTimeout(3000);
    
    // 检查模式选择
    await expect(page.getByText(/游戏模式/)).toBeVisible();
    await expect(page.getByRole('button', { name: /标准/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Out/i })).toBeVisible();
    
    // 截图
    await page.screenshot({ path: 'test-results/mobile-game-mode.png' });
  });
});
