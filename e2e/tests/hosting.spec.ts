import { test, expect } from '@playwright/test';

/**
 * 托管功能（Hosting）E2E 测试
 */

test.setTimeout(90000);

test.describe('托管功能测试', () => {
  
  async function createRoomAndStartGame(page: any, nickname: stout) {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
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
  
  test('托管按钮在底部显示', async ({ page }) => {
    await createRoomAndStartGame(page, '托管测试');
    
    // 检查底部操作栏的托管按钮
    const hostingButton = page.locator('button[title="开启托管模式"]').first();
    await expect(hostingButton).toBeVisible();
    await expect(hostingButton).toHaveText('托管');
  });
  
  test('点击托管按钮切换状态', async ({ page }) => {
    await createRoomAndStartGame(page, '托管切换');
    
    // 点击托管按钮（开启）
    const hostingButton = page.locator('button[title="开启托管模式"]').first();
    await expect(hostingButton).toBeVisible();
    await hostingButton.click();
    await page.waitForTimeout(1500);
    
    // 验证状态变化 - 按钮变为"托管中"
    const activeHostingButton = page.locator('button[title="关闭托管模式"]').first();
    await expect(activeHostingButton).toBeVisible({ timeout: 5000 });
    await expect(activeHostingButton).toHaveText(/托管中/);
    
    // 再次点击取消托管
    await activeHostingButton.click();
    await page.waitForTimeout(1500);
    
    // 验证恢复为"托管"
    const inactiveHostingButton = page.locator('button[title="开启托管模式"]').first();
    await expect(inactiveHostingButton).toBeVisible({ timeout: 5000 });
    await expect(inactiveHostingButton).toHaveText('托管');
  });
  
  test('移动端托管按钮不遮挡', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    await createRoomAndStartGame(page, '移动托管');
    
    // 检查UNO按钮和托管按钮布局
    const unoButton = page.getByRole('button', { name: /UNO/i });
    const hostingButton = page.locator('button[title="开启托管模式"]').first();
    
    await expect(unoButton).toBeVisible();
    await expect(hostingButton).toBeVisible();
    
    // 检查两者不重叠（粗略检查）
    const unoBox = await unoButton.boundingBox();
    const hostingBox = await hostingButton.boundingBox();
    
    if (unoBox && hostingBox) {
      // 按钮应该并排显示，Y坐标接近
      const yDiff = Math.abs(unoBox.y - hostingBox.y);
      expect(yDiff).toBeLessThan(50); // Y方向差异小于50px
    }
    
    await page.screenshot({ path: 'test-results/mobile-hosting.png' });
  });
});
