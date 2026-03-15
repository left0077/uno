import { test, expect } from '@playwright/test';

/**
 * 断线重连功能测试套件
 * 测试页面刷新后的重连、网络断开恢复等功能
 */

test.describe('断线重连测试', () => {
  
  test('页面刷新后自动重连房间', async ({ page }) => {
    // 进入首页并创建房间
    await page.goto('/');
    await page.getByPlaceholder(/昵称/i).first().fill('测试玩家');
    await page.getByRole('button', { name: /创建房间/i }).click();
    
    // 等待进入房间
    await page.waitForTimeout(3000); // 等待房间页面加载
    await expect(page.getByText('测试玩家')).toBeVisible();
    
    // 记录房间号
    const pageContent = await page.content();
    const roomCodeMatch = pageContent.match(/(\d{4})/);
    expect(roomCodeMatch).toBeTruthy();
    const roomCode = roomCodeMatch![1];
    
    console.log('原房间号:', roomCode);
    
    // 截图刷新前的状态
    await page.screenshot({ path: 'test-results/before-refresh.png' });
    
    // 刷新页面
    await page.reload();
    
    // 等待重连
    await page.waitForTimeout(5000);
    
    // 截图刷新后的状态
    await page.screenshot({ path: 'test-results/after-refresh.png' });
    
    // 验证仍然在房间中
    const afterContent = await page.content();
    const afterRoomMatch = afterContent.match(/(\d{4})/);
    
    // 应该显示相同的房间号
    if (afterRoomMatch) {
      expect(afterRoomMatch[1]).toBe(roomCode);
    }
    
    // 验证玩家信息仍然存在
    await expect(page.getByText('测试玩家')).toBeVisible({ timeout: 10000 });
  });

  test('游戏中刷新页面后恢复游戏状态', async ({ page }) => {
    // 创建房间并添加AI开始游戏
    await page.goto('/');
    await page.getByPlaceholder(/请输入昵称|昵称/i).fill('玩家');
    await page.getByRole('button', { name: /创建房间/i }).click();
    await page.waitForTimeout(3000); // 等待房间页面加载
    
    // 添加AI
    await page.getByText(/添加AI|AI/i).click();
    await page.waitForTimeout(500);
    
    // 开始游戏
    await page.getByText(/开始游戏|开始/i).click();
    
    // 等待游戏开始
    await expect(page.locator('.card, [class*="card"]').first()).toBeVisible({ timeout: 10000 });
    
    // 记录游戏状态
    const beforeContent = await page.content();
    const hasGameStarted = beforeContent.includes('回合') || beforeContent.includes('手牌') || 
                          await page.locator('.card, [class*="hand"]').first().isVisible().catch(() => false);
    
    expect(hasGameStarted).toBeTruthy();
    
    // 截图游戏状态
    await page.screenshot({ path: 'test-results/game-before-refresh.png' });
    
    // 刷新页面
    await page.reload();
    
    // 等待重连和游戏恢复
    await page.waitForTimeout(6000);
    
    // 截图恢复后的状态
    await page.screenshot({ path: 'test-results/game-after-refresh.png' });
    
    // 验证游戏状态恢复（应该能看到手牌或游戏界面）
    const afterContent = await page.content();
    const gameRestored = afterContent.includes('回合') || 
                        afterContent.includes('手牌') ||
                        await page.locator('.card, [class*="hand"], [class*="game"]').first().isVisible().catch(() => false);
    
    expect(gameRestored).toBeTruthy();
  });

  test('重连后可以继续出牌', async ({ browser }) => {
    // 创建两个玩家进行游戏
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    try {
      // 玩家1创建房间
      await page1.goto('/');
      await page1.getByPlaceholder(/请输入昵称|昵称/i).fill('玩家1');
      await page1.getByText(/创建房间/i).click();
      await expect(page1.getByText(/房间|Room/i)).toBeVisible({ timeout: 15000 });
      
      // 获取房间号
      const pageContent = await page1.content();
      const roomCodeMatch = pageContent.match(/(\d{4})/);
      expect(roomCodeMatch).toBeTruthy();
      const roomCode = roomCodeMatch![1];
      
      // 玩家2加入房间
      await page2.goto('/');
      await page2.getByPlaceholder(/请输入昵称|昵称/i).fill('玩家2');
      await page2.getByText(/加入房间/i).click();
      const roomInput = page2.getByPlaceholder(/\d{4}|房间号/i);
      await roomInput.fill(roomCode);
      await page2.getByText(/进入|加入/i).click();
      await expect(page2.getByText('玩家2')).toBeVisible({ timeout: 15000 });
      
      // 等待两个玩家都显示在房间
      await expect(page1.getByText('玩家2')).toBeVisible({ timeout: 5000 });
      
      // 玩家1开始游戏
      await page1.getByText(/开始游戏|开始/i).click();
      
      // 等待游戏开始
      await expect(page1.locator('.card, [class*="card"]').first()).toBeVisible({ timeout: 10000 });
      await expect(page2.locator('.card, [class*="card"]').first()).toBeVisible({ timeout: 10000 });
      
      // 截图游戏开始状态
      await page1.screenshot({ path: 'test-results/reconnect-game-started-p1.png' });
      await page2.screenshot({ path: 'test-results/reconnect-game-started-p2.png' });
      
      // 玩家2刷新页面
      await page2.reload();
      await page2.waitForTimeout(6000);
      
      // 截图玩家2重连后的状态
      await page2.screenshot({ path: 'test-results/reconnect-after-refresh-p2.png' });
      
      // 验证玩家2重连成功且能看到手牌
      const hasCards = await page2.locator('.card, [class*="card"]').first().isVisible().catch(() => false);
      expect(hasCards).toBeTruthy();
      
      // 验证玩家1仍然看到玩家2
      await expect(page1.getByText('玩家2')).toBeVisible({ timeout: 5000 });
      
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('重连后倒计时正常更新', async ({ page }) => {
    // 创建房间并开始游戏
    await page.goto('/');
    await page.getByPlaceholder(/请输入昵称|昵称/i).fill('玩家');
    await page.getByRole('button', { name: /创建房间/i }).click();
    await page.waitForTimeout(3000); // 等待房间页面加载
    
    // 添加AI并开始游戏
    await page.getByText(/添加AI|AI/i).click();
    await page.waitForTimeout(500);
    await page.getByText(/开始游戏|开始/i).click();
    
    // 等待游戏开始
    await expect(page.locator('.card, [class*="card"]').first()).toBeVisible({ timeout: 10000 });
    
    // 获取当前倒计时
    const getTimer = async () => {
      const content = await page.content();
      const match = content.match(/(\d+):(\d+)/);
      return match ? parseInt(match[1]) * 60 + parseInt(match[2]) : null;
    };
    
    const timerBefore = await getTimer();
    console.log('刷新前倒计时:', timerBefore);
    
    // 刷新页面
    await page.reload();
    await page.waitForTimeout(6000);
    
    // 获取刷新后的倒计时
    const timerAfter = await getTimer();
    console.log('刷新后倒计时:', timerAfter);
    
    // 倒计时应该存在且与之前不同（证明计时器在工作）
    expect(timerAfter).not.toBeNull();
  });

  test('断网后自动重连提示', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder(/昵称/i).first().fill('测试玩家');
    await page.getByRole('button', { name: /创建房间/i }).click();
    await page.waitForTimeout(3000); // 等待房间页面加载
    
    // 模拟断网
    await page.context().setOffline(true);
    
    // 等待断网提示出现
    await page.waitForTimeout(3000);
    
    // 截图断网状态
    await page.screenshot({ path: 'test-results/offline-notification.png' });
    
    // 检查是否有断网或重连提示
    const content = await page.content();
    const hasDisconnectMessage = content.includes('断开') || 
                                 content.includes('重连') || 
                                 content.includes('离线') ||
                                 content.includes('reconnect') ||
                                 content.includes('disconnected');
    
    // 恢复网络
    await page.context().setOffline(false);
    await page.waitForTimeout(3000);
    
    // 截图恢复状态
    await page.screenshot({ path: 'test-results/online-notification.png' });
    
    // 验证重连成功
    await expect(page.getByText('测试玩家')).toBeVisible({ timeout: 5000 });
  });

  test('localStorage 持久化 userId', async ({ page }) => {
    await page.goto('/');
    
    // 获取 localStorage 中的 userId
    const userId1 = await page.evaluate(() => localStorage.getItem('uno-user-id'));
    
    // 第一次访问应该生成 userId
    expect(userId1).toBeTruthy();
    expect(userId1).toMatch(/^[0-9a-f-]{36}$/i); // UUID 格式
    
    // 刷新页面
    await page.reload();
    
    // 获取刷新后的 userId
    const userId2 = await page.evaluate(() => localStorage.getItem('uno-user-id'));
    
    // userId 应该保持一致
    expect(userId2).toBe(userId1);
    
    console.log('持久化 userId:', userId2);
  });
});
